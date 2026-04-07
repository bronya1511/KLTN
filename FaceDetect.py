#!/usr/bin/env python3
# FaceDetect.py - chup 5 goc (CENTER/LEFT/RIGHT/UP/DOWN) voi live HUD
# - KLT tracker (calcOpticalFlowPyrLK), khong can opencv-contrib
# - Hysteresis + smooth + auto calibration
# - Fallback yaw tu do lech bbox khi thieu landmarks
# - Fallback detect: HOG -> Haar frontal -> Haar profile (+ lat anh) cho LEFT/RIGHT
# - Chi chup khi khung xanh on dinh; xuat gray 224x224 (denoise + CLAHE + sharpen)

import os, sys, time, argparse
from pathlib import Path
from collections import deque

import cv2
import numpy as np
import face_recognition

# Import detect_boxes from python-face folder
sys.path.insert(0, str(Path(__file__).resolve().parent / "python-face"))
from detect_face_ncnn import detect_boxes

# ================== tham so ==================
POSE_ORDER       = ["CENTER", "LEFT", "RIGHT", "UP", "DOWN"]
STABLE_FRAMES    = 6           # so frame on dinh de chuyen xanh

# smoothing + hysteresis
SMOOTH_WIN       = 7
YAW_ENTER        = 0.65
YAW_EXIT         = 0.45
PITCH_UP_ENTER   = -0.35
PITCH_UP_EXIT    = -0.25
PITCH_DOWN_ENTER = 0.70
PITCH_DOWN_EXIT  = 0.50

# deadband cho soft match
DEADBAND_YAW     = 0.03
DEADBAND_PITCH   = 0.03

# crop tu landmarks
SCALE_LANDMARK   = 1.60
MIN_FACE_FRAC    = 0.22
MAX_FACE_FRAC    = 0.97
MARGIN           = 8

# camera / detect
CAM_RES          = (640, 480)
DOWNSCALE        = 0.60        # detect tren anh to hon
DETECT_INTERVAL  = 3           # detect lai thuong hon khi chua on dinh
LANDMARK_MODEL   = "large"     # robust hon voi kinh/sang

# auto calibration
CALIB_SEC        = 1.0
KEEP_LAST_SEC    = 0.30        # giu yaw/pitch cu khi mat landmarks
# ============================================

# picamera2 (neu co)
USE_PICAM = False
try:
    from picamera2 import Picamera2  # type: ignore
    USE_PICAM = True
except Exception:
    USE_PICAM = False

# ===== tien ich =====
dx_hist = deque(maxlen=SMOOTH_WIN)
dy_hist = deque(maxlen=SMOOTH_WIN)

def clamp(a, lo, hi): return max(lo, min(a, hi))

def enhance_gray(img_gray):
    # denoise + clahe + sharpen
    img = cv2.fastNlMeansDenoising(img_gray, None, h=7, templateWindowSize=7, searchWindowSize=21)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    img = clahe.apply(img)
    blur = cv2.GaussianBlur(img, (0,0), 1.2)
    sharp = cv2.addWeighted(img, 1.6, blur, -0.6, 0)
    return sharp

def open_camera(cam_index: int = -1):
    if USE_PICAM and cam_index == -1:
        cam = Picamera2()
        cam.configure(cam.create_preview_configuration(main={"format":"XRGB8888","size":CAM_RES}))
        cam.start()
        def _read(): return True, cam.capture_array()
        return cam, _read, "picamera2"
    else:
        idx = cam_index if cam_index >= 0 else 0
        cam = cv2.VideoCapture(idx)
        if not cam.isOpened():
            print("[ERROR] cannot open camera via OpenCV", file=sys.stderr); return None, None, "opencv"
        cam.set(cv2.CAP_PROP_FRAME_WIDTH,  CAM_RES[0])
        cam.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_RES[1])
        def _read(): ok, f = cam.read(); return ok, f
        return cam, _read, "opencv"

def bbox_from_landmarks(lms, scale, H, W):
    pts = []
    for k in ("left_eye","right_eye","nose_tip","top_lip","bottom_lip","chin","nose_bridge"):
        if k in lms: pts += lms[k]
    if not pts: return None
    pts = np.array(pts, dtype=np.float32)
    x1,y1 = pts.min(axis=0); x2,y2 = pts.max(axis=0)
    cx, cy = (x1+x2)/2, (y1+y2)/2
    s  = max(x2-x1, y2-y1) * scale
    x1 = int(clamp(cx - s/2, 0, W-1)); y1 = int(clamp(cy - s/2, 0, H-1))
    x2 = int(clamp(cx + s/2, 0, W-1)); y2 = int(clamp(cy + s/2, 0, H-1))
    return (x1, y1, x2-x1, y2-y1)

def yaw_pitch(lms):
    # tinh yaw/pitch don gian tu vi tri mui so voi trung diem 2 mat
    def c(pts): return np.array(pts, dtype=np.float32).mean(axis=0)
    if "left_eye" not in lms or "right_eye" not in lms or "nose_tip" not in lms:
        return None, None, None
    le = c(lms["left_eye"]); re = c(lms["right_eye"]); nt = lms["nose_tip"][-1]
    eye_c  = (le + re) / 2.0
    inter  = float(np.linalg.norm(le - re))
    if inter < 1e-3: return None, None, None
    dx = (nt[0] - eye_c[0]) / inter
    dy = (nt[1] - eye_c[1]) / inter
    return dx, dy, inter

def draw_ui(frame, target_pose, got_map, stable, need, dbg=""):
    H, W = frame.shape[:2]
    ov = frame.copy()
    cv2.rectangle(ov, (0, 0), (W, 140), (0, 0, 0), -1)
    frame = cv2.addWeighted(ov, 0.35, frame, 0.65, 0)

    msg_map = {
        "CENTER": "Nhin THANG vao camera",
        "LEFT":   "Quay SANG TRAI",
        "RIGHT":  "Quay SANG PHAI",
        "UP":     "Ngang CAM len tren",
        "DOWN":   "Ha CAM xuong duoi",
    }
    msg = f"[{target_pose}] {msg_map[target_pose]}"
    color = (0,255,0) if stable >= need else (0,215,255)
    cv2.putText(frame, msg, (18, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2, cv2.LINE_AA)

    bar = int((stable/need)*240)
    cv2.rectangle(frame,(18,55),(18+240,75),(80,80,80),2)
    cv2.rectangle(frame,(18,55),(18+bar,75),color,-1)

    ck = " | ".join([f"{p}:{got_map[p]}/1" for p in POSE_ORDER])
    cv2.putText(frame, ck, (18, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,255), 2, cv2.LINE_AA)
    if dbg:
        cv2.putText(frame, dbg, (18, 128), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200,200,200), 1, cv2.LINE_AA)
    return frame

def is_pose_match_soft(target, dx, dy):
    if dx is None or (dy is None and target in ("CENTER","UP","DOWN")):
        return False
    if target == "CENTER":
        return (abs(dx) < (YAW_EXIT - DEADBAND_YAW)) and ((PITCH_UP_EXIT + DEADBAND_PITCH) < dy < (PITCH_DOWN_EXIT - DEADBAND_PITCH))
    if target == "LEFT":   return dx < -(YAW_ENTER - DEADBAND_YAW)
    if target == "RIGHT":  return dx >  (YAW_ENTER - DEADBAND_YAW)
    if target == "UP":     return dy <  (PITCH_UP_ENTER + DEADBAND_PITCH)
    if target == "DOWN":   return dy >  (PITCH_DOWN_ENTER - DEADBAND_PITCH)
    return False

# ===== KLT tracker =====
class KLTTracker:
    def __init__(self, max_corners=120, quality=0.01, min_dist=5):
        self.max_corners = max_corners
        self.quality = quality
        self.min_dist = min_dist
        self.prev_gray = None
        self.prev_pts  = None
        self.box = None
        self.HW = None

    def init(self, frame, box):
        x,y,w,h = [int(v) for v in box]
        self.HW = frame.shape[:2]
        self.box = (x,y,w,h)
        self.prev_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        roi = self.prev_gray[y:y+h, x:x+w]
        pts = cv2.goodFeaturesToTrack(roi, maxCorners=self.max_corners,
                                      qualityLevel=self.quality, minDistance=self.min_dist)
        if pts is None or len(pts) < 8:
            self.prev_pts = None
            return False
        pts = pts.reshape(-1,2); pts[:,0] += x; pts[:,1] += y
        self.prev_pts = pts.astype(np.float32)
        return True

    def update(self, frame):
        if self.prev_pts is None or self.prev_gray is None or self.box is None:
            return False, None
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        next_pts, st, _ = cv2.calcOpticalFlowPyrLK(self.prev_gray, gray, self.prev_pts, None,
                                                   winSize=(21,21), maxLevel=3,
                                                   criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,20,0.03))
        if next_pts is None or st is None: return False, None
        good_new = next_pts[st.flatten()==1]
        if len(good_new) < 8: return False, None
        x1,y1 = np.min(good_new, axis=0); x2,y2 = np.max(good_new, axis=0)
        pad_x = (x2-x1)*0.15; pad_y = (y2-y1)*0.15
        H,W = self.HW
        x1 = int(clamp(x1-pad_x, 0, W-1)); y1 = int(clamp(y1-pad_y, 0, H-1))
        x2 = int(clamp(x2+pad_x, 0, W-1)); y2 = int(clamp(y2+pad_y, 0, H-1))
        self.box = (x1, y1, x2-x1, y2-y1)
        self.prev_gray = gray
        self.prev_pts  = good_new.reshape(-1,2)
        return True, self.box

# ===== vong chinh =====
def capture(mssv: str, save_dir: str, show: int, cam_index: int):
    out_dir = Path(save_dir)/mssv
    out_dir.mkdir(parents=True, exist_ok=True)

    cam, read_fn, mode = open_camera(cam_index)
    if cam is None: sys.exit(3)
    if show:
        cv2.namedWindow("capture", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("capture", 960, 540)

    got = {p:0 for p in POSE_ORDER}
    target_idx = 0
    pose_stable = 0
    stable_cnt = 0

    tracker = None
    track_box = None
    frame_idx = 0

    fps, last_t = 0.0, time.time()

    # auto calibration
    dx0 = 0.0; dy0 = 0.0
    calib_t0 = None
    calib_done = False

    # giu gia tri lan cuoi tot
    last_ok_dx = None; last_ok_dy = None; last_ok_t = 0.0

    # deleted haar defaults

    try:
        while sum(got.values()) < len(POSE_ORDER):
            ok, frame = read_fn()
            if not ok or frame is None: continue
            frame_idx += 1
            now = time.time(); dt = max(1e-6, now - last_t); last_t = now
            fps = 0.9*fps + 0.1*(1.0/dt)

            H,W = frame.shape[:2]
            vis = frame.copy()

            # detect khi: chua co tracker hoac mat box hoac den chu ky
            need_redetect = (
                tracker is None
                or track_box is None
                or ((frame_idx % DETECT_INTERVAL == 0) and (pose_stable < 2))
            )

            if need_redetect:
                small = cv2.resize(frame, (0,0), fx=DOWNSCALE, fy=DOWNSCALE, interpolation=cv2.INTER_LINEAR)
                gray_small = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
                rgb_small  = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

                x=y=w=h=None

                # 1) YOLOv8 NCNN Face Detection
                try:
                    ncnn_boxes = detect_boxes(rgb_small, conf_thresh=0.45)
                    if ncnn_boxes:
                        sx, sy, sw, sh = max(ncnn_boxes, key=lambda b:b[2]*b[3])
                        x = int(sx/DOWNSCALE); y = int(sy/DOWNSCALE)
                        w = int(sw/DOWNSCALE); h = int(sh/DOWNSCALE)
                except Exception as e:
                    print(f"Error in NCNN Detection: {e}")

                if w and h:
                    track_box = (x,y,w,h)
                    tracker = KLTTracker()
                    if not tracker.init(frame, track_box):
                        tracker = None; track_box = None; stable_cnt = 0
                    else:
                        stable_cnt = 1
                else:
                    tracker = None; track_box = None; stable_cnt = 0
            else:
                ok_t, box = tracker.update(frame) if tracker is not None else (False, None)
                if ok_t and box is not None:
                    track_box = tuple(int(v) for v in box)
                    stable_cnt = min(stable_cnt + 1, STABLE_FRAMES + 2)
                else:
                    tracker = None; track_box = None; stable_cnt = 0

            if track_box is None:
                if show:
                    vis = draw_ui(vis, POSE_ORDER[target_idx], got, pose_stable, STABLE_FRAMES, "no box")
                    cv2.putText(vis,f"MSSV {mssv} | FPS {fps:0.1f}",(18,H-12),cv2.FONT_HERSHEY_SIMPLEX,0.6,(255,255,255),2,cv2.LINE_AA)
                    cv2.imshow("capture", vis)
                    if (cv2.waitKey(1) & 0xFF) == ord('q'): break
                continue

            x,y,w,h = track_box
            dx_adj = None; dy_adj = None

            # landmarks tren ROI
            lms_list = None
            rgb_roi = cv2.cvtColor(frame[y:y+h, x:x+w], cv2.COLOR_BGR2RGB)
            try:
                lms_list = face_recognition.face_landmarks(rgb_roi, face_locations=[(0,w,h,0)], model=LANDMARK_MODEL)
            except Exception:
                lms_list = None

            # yaw/pitch + smooth + auto-calib
            if lms_list:
                lms = {k:[(pt[0]+x, pt[1]+y) for pt in v] for k,v in lms_list[0].items()}
                dx, dy, inter = yaw_pitch(lms)
                if dx is not None:
                    dx_hist.append(dx); dy_hist.append(dy)
                    dx_s = float(np.median(dx_hist)); dy_s = float(np.median(dy_hist))
                    if not calib_done:
                        if calib_t0 is None: calib_t0 = now
                        if abs(dx_s) < 0.2:
                            a = 0.15
                            dx0 = (1-a)*dx0 + a*dx_s
                            dy0 = (1-a)*dy0 + a*dy_s
                        if now - calib_t0 >= CALIB_SEC:
                            calib_done = True
                    dx_adj = dx_s - dx0
                    dy_adj = dy_s - dy0
                    last_ok_dx, last_ok_dy = dx_adj, dy_adj
                    last_ok_t = now
                lb = bbox_from_landmarks(lms, SCALE_LANDMARK, H, W)
                if lb is not None: x,y,w,h = lb
            else:
                if now - last_ok_t <= KEEP_LAST_SEC and last_ok_dx is not None:
                    dx_adj, dy_adj = last_ok_dx, last_ok_dy

            # fallback yaw tu do lech bbox
            if dx_adj is None:
                cx_face = x + w/2.0
                cx_fr   = W / 2.0
                dx_fb = (cx_face - cx_fr) / max(1.0, w)
                dx_fb *= 1.3
                dx_adj = float(dx_fb)

            target_pose = POSE_ORDER[target_idx]

            # cap nhat diem on dinh theo tu the
            if is_pose_match_soft(target_pose, dx_adj, dy_adj):
                pose_stable = min(pose_stable + 2, STABLE_FRAMES + 3)
            else:
                pose_stable = max(pose_stable - 1, 0)

            # ve bbox theo pose_stable
            color = (0,255,0) if pose_stable >= STABLE_FRAMES else (0,215,255)
            cv2.rectangle(vis,(x,y),(x+w,y+h),color,2)

            # auto-shrink neu cham vien / qua to
            def shrink_box(x_, y_, w_, h_, ratio=0.92):
                cx, cy = x_ + w_/2.0, y_ + h_/2.0
                nw, nh = w_*ratio, h_*ratio
                return int(cx - nw/2), int(cy - nh/2), int(nw), int(nh)

            for _ in range(3):
                x1,y1 = clamp(x,0,W-1), clamp(y,0,H-1)
                x2,y2 = clamp(x+w,0,W-1), clamp(y+h,0,H-1)
                touch_edge_tmp = (x1<=MARGIN or y1<=MARGIN or x2>=W-MARGIN or y2>=H-MARGIN)
                frac_tmp = (y2-y1)/H
                if not touch_edge_tmp and frac_tmp <= MAX_FACE_FRAC:
                    break
                x,y,w,h = shrink_box(x,y,w,h,ratio=0.92)

            # reason debug
            reason = ""
            if dx_adj is not None and (dy_adj is not None or target_pose in ("LEFT","RIGHT")):
                if target_pose == "CENTER":
                    if abs(dx_adj) >= YAW_EXIT:                        reason = f"yaw {dx_adj:+.2f} >= {YAW_EXIT}"
                    elif dy_adj is not None and dy_adj <= PITCH_UP_EXIT:        reason = f"pitch {dy_adj:+.2f} <= {PITCH_UP_EXIT}"
                    elif dy_adj is not None and dy_adj >= PITCH_DOWN_EXIT:      reason = f"pitch {dy_adj:+.2f} >= {PITCH_DOWN_EXIT}"
                elif target_pose == "LEFT"  and not (dx_adj <  -YAW_ENTER + DEADBAND_YAW):         reason = f"yaw {dx_adj:+.2f} > -{YAW_ENTER}"
                elif target_pose == "RIGHT" and not (dx_adj >   YAW_ENTER - DEADBAND_YAW):         reason = f"yaw {dx_adj:+.2f} <  {YAW_ENTER}"
                elif target_pose == "UP"    and not (dy_adj is not None and dy_adj <  PITCH_UP_ENTER + DEADBAND_PITCH):    reason = f"pitch {dy_adj:+.2f} >= {PITCH_UP_ENTER}"
                elif target_pose == "DOWN"  and not (dy_adj is not None and dy_adj >  PITCH_DOWN_ENTER - DEADBAND_PITCH):  reason = f"pitch {dy_adj:+.2f} <= {PITCH_DOWN_ENTER}"

            # quality gate
            need_keys = {"left_eye","right_eye","nose_tip"}
            has_need = bool(lms_list) and need_keys.issubset(set(lms_list[0].keys())) if lms_list else False
            x1,y1 = clamp(x,0,W-1), clamp(y,0,H-1)
            x2,y2 = clamp(x+w,0,W-1), clamp(y+h,0,H-1)
            touch_edge = (x1<=MARGIN or y1<=MARGIN or x2>=W-MARGIN or y2>=H-MARGIN)
            frac = (y2-y1)/H

            # HUD
            hud_dbg = ("" if not reason else f"{reason}")
            metric = f"yaw={dx_adj:+.2f}" + ("" if dy_adj is None else f" pitch={dy_adj:+.2f}")
            vis = draw_ui(vis, target_pose, got, pose_stable, STABLE_FRAMES,
                          metric + ("" if calib_done else " [calib]") + ("" if not hud_dbg else f" | {hud_dbg}"))

            why = []
            if not has_need and target_pose=="CENTER":  # giam rang buoc cho goc khac
                why.append("mat landmarks")
            if touch_edge:    why.append("mat cham vien")
            if not (MIN_FACE_FRAC <= frac <= MAX_FACE_FRAC): why.append(f"size {frac:.2f}")
            if why:
                cv2.putText(vis, " | ".join(why), (18, 154),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0,200,255), 2, cv2.LINE_AA)

            # luu anh khi hop le
            if (pose_stable >= STABLE_FRAMES and (not touch_edge)
                and (MIN_FACE_FRAC <= frac <= MAX_FACE_FRAC)):
                crop = frame[y:y+h, x:x+w]
                g = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                g = enhance_gray(g)
                face_out = cv2.resize(g, (224, 224), interpolation=cv2.INTER_CUBIC)
                fn = (out_dir/f"{mssv}_{target_pose}_{int(time.time()*1000)}.jpg")
                cv2.imwrite(str(fn), face_out, [cv2.IMWRITE_JPEG_QUALITY, 95])
                print(f"[INFO] saved {fn} ({sum(got.values())+1}/{len(POSE_ORDER)})")
                got[target_pose] = 1
                pose_stable = 0
                target_idx = min(target_idx + 1, len(POSE_ORDER)-1)

            if show:
                cv2.putText(vis,f"MSSV {mssv} | FPS {fps:0.1f}",(18,H-12),cv2.FONT_HERSHEY_SIMPLEX,0.6,(255,255,255),2,cv2.LINE_AA)
                cv2.imshow("capture", vis)
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'): break
                elif key == ord('z'):
                    calib_t0   = time.time()
                    dx0 = 0.0; dy0 = 0.0
                    calib_done = False
                    pose_stable = 0

        if show:
            done = frame.copy() if frame is not None else None
            if done is not None:
                cv2.putText(done,"DONE (5 POSES)",(40,80),cv2.FONT_HERSHEY_SIMPLEX,2,(0,255,0),4,cv2.LINE_AA)
                cv2.imshow("capture", done); cv2.waitKey(600)

    finally:
        try:
            if USE_PICAM and cam and mode=="picamera2": cam.stop()
            elif cam: cam.release()
        except Exception: pass
        cv2.destroyAllWindows()

def main():
    ap = argparse.ArgumentParser(description="Chup 5 goc live + tracker + auto calib")
    ap.add_argument("--mssv", required=True, help="ma so sinh vien")
    ap.add_argument("--save_dir", default="dataset", help="thu muc luu anh")
    ap.add_argument("--show", type=int, default=1, help="1: hien live")
    ap.add_argument("--cam", type=int, default=-1, help="-1: PiCam2, 0..: webcam USB")
    args = ap.parse_args()

    os.environ.setdefault("OMP_NUM_THREADS","1")
    os.environ.setdefault("OPENBLAS_NUM_THREADS","1")

    capture(args.mssv, args.save_dir, args.show, args.cam)

if __name__ == "__main__":
    main()
