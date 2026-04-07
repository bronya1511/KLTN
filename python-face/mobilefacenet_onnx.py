# mobilefacenet_onnx.py
# Wrapper cho MobileFaceNet/ArcFace ONNX (NHWC hoac NCHW)

import os
import cv2
import numpy as np
import onnxruntime as ort
from typing import Tuple

def l2norm(v: np.ndarray, eps: float = 1e-9, axis: int | tuple[int, ...] | None = None) -> np.ndarray:
    """
    Chuan hoa L2 vector/ma tran.
    - Neu v 1-D -> chuan hoa toan bo.
    - Neu v >=2-D -> chuan hoa theo truc cuoi mac dinh.
    """
    arr = np.asarray(v, dtype=np.float32)
    if axis is None and arr.ndim > 1:
        axis = -1
    keepdims = axis is not None
    denom = np.linalg.norm(arr, axis=axis, keepdims=keepdims)
    denom = np.maximum(denom, eps)
    return arr / denom

class MobileFaceNet:
    def __init__(
        self,
        onnx_path: str,
        providers=None,
        use_clahe: bool = True,
        flip_aug: bool = False,
    ):
        # khoi tao onnxruntime
        if not os.path.exists(onnx_path):
            raise FileNotFoundError(f"Missing ONNX model: {onnx_path}")

        if providers is None:
            providers = ["CPUExecutionProvider"]

        self.sess = ort.InferenceSession(onnx_path, providers=providers)
        self.input = self.sess.get_inputs()[0]
        self.input_name = self.input.name
        self.input_shape = list(self.input.shape)  # [N,H,W,C] or [N,C,H,W]
        self.use_clahe = use_clahe
        self.flip_aug = flip_aug

        # suy ra NHWC hay NCHW + size 112
        # vi du: ['unk__556', 112, 112, 3]  -> NHWC
        #        ['unk__556', 3, 112, 112]  -> NCHW
        shp = self.input_shape
        self.is_nhwc = False
        self.size = 112

        if len(shp) == 4:
            # co the None/unk o batch dims
            h_w_c = shp[1:]
            # neu cuoi la 3 thi NHWC
            if h_w_c[-1] == 3 or (isinstance(h_w_c[-1], str) and "3" in str(h_w_c[-1])):
                self.is_nhwc = True
                self.size = int(h_w_c[0]) if isinstance(h_w_c[0], int) else 112
            else:
                # mac dinh NCHW
                self.is_nhwc = False
                self.size = int(shp[2]) if isinstance(shp[2], int) else 112
        else:
            # truong hop khac thi dung NHWC 112
            self.is_nhwc = True
            self.size = 112

        # lay ten output
        self.out_name = self.sess.get_outputs()[0].name

    def preprocess_bgr(
        self,
        bgr: np.ndarray,
        out_size: int = None,
        use_clahe: bool | None = None,
    ) -> np.ndarray:
        # resize ve self.size
        s = out_size or self.size
        img = cv2.resize(bgr, (s, s), interpolation=cv2.INTER_LINEAR)

        # tuy chon clahe nhe tren kenh Y de giam chay sang
        if use_clahe is None:
            use_clahe = self.use_clahe
        if use_clahe:
            yuv = cv2.cvtColor(img, cv2.COLOR_BGR2YUV)
            y, u, v = cv2.split(yuv)
            clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
            y = clahe.apply(y)
            img = cv2.cvtColor(cv2.merge([y, u, v]), cv2.COLOR_YUV2BGR)

        # BGR -> RGB va chuan hoa [-1, 1]
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        rgb = rgb.astype(np.float32)
        rgb = (rgb - 127.5) / 128.0

        # NHWC hoac NCHW
        if self.is_nhwc:
            inp = rgb[None, ...]  # (1,H,W,C)
        else:
            chw = np.transpose(rgb, (2, 0, 1))  # (C,H,W)
            inp = chw[None, ...]  # (1,C,H,W)
        return inp

    def _embed_once(self, bgr: np.ndarray, use_clahe: bool | None = None) -> np.ndarray:
        inp = self.preprocess_bgr(bgr, use_clahe=use_clahe)
        out = self.sess.run([self.out_name], {self.input_name: inp})[0]
        vec = out[0].astype(np.float32).reshape(-1)
        return vec

    def embed_bgr(self, bgr: np.ndarray, flip_aug: bool | None = None) -> np.ndarray:
        # tao embedding 512-D, da L2 norm
        use_flip = self.flip_aug if flip_aug is None else flip_aug
        vecs = [self._embed_once(bgr)]
        if use_flip:
            bgr_flip = cv2.flip(bgr, 1)
            if bgr_flip is not None:
                vecs.append(self._embed_once(bgr_flip))
        if len(vecs) == 1:
            vec = vecs[0]
        else:
            vec = np.mean(vecs, axis=0)
        return l2norm(vec)
