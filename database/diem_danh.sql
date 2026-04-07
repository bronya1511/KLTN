-- phpMyAdmin SQL Dump
-- version 5.2.1deb1+deb12u1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 19, 2025 at 04:18 AM
-- Server version: 10.11.14-MariaDB-0+deb12u2
-- PHP Version: 8.2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `diem_danh`
--

-- --------------------------------------------------------

--
-- Table structure for table `anh_khuon_mat`
--

CREATE TABLE `anh_khuon_mat` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `mssv` varchar(10) NOT NULL,
  `duong_dan_tep` varchar(255) NOT NULL,
  `thoi_diem_chup` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `canh_bao_gian_lan`
--

CREATE TABLE `canh_bao_gian_lan` (
  `ma_canh_bao` int(11) NOT NULL,
  `ma_diem_danh` int(11) NOT NULL,
  `loai_canh_bao` enum('Diem danh trung','Sinh vien khong co trong lop') NOT NULL,
  `mo_ta` text DEFAULT NULL,
  `thoi_gian_phat_hien` datetime DEFAULT current_timestamp(),
  `trang_thai` enum('Chua xu ly','Da xac minh','Da xu ly') DEFAULT 'Chua xu ly',
  `ma_giang_vien_xu_ly` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `canh_bao_gian_lan`
--

INSERT INTO `canh_bao_gian_lan` (`ma_canh_bao`, `ma_diem_danh`, `loai_canh_bao`, `mo_ta`, `thoi_gian_phat_hien`, `trang_thai`, `ma_giang_vien_xu_ly`) VALUES
(20, 35, 'Diem danh trung', 'SV 22521379 lop CE304 diem danh trung trong khoang thoi gian ngan', '2025-11-18 16:12:56', 'Chua xu ly', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `cong_viec_huan_luyen`
--

CREATE TABLE `cong_viec_huan_luyen` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `trang_thai` enum('QUEUED','RUNNING','SUCCESS','FAILED') NOT NULL DEFAULT 'QUEUED',
  `bat_dau_luc` timestamp NULL DEFAULT NULL,
  `ket_thuc_luc` timestamp NULL DEFAULT NULL,
  `danh_sach_mssv` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`danh_sach_mssv`)),
  `phien_ban_mo_hinh` varchar(32) DEFAULT NULL,
  `ghi_chu` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dang_ky_lop`
--

CREATE TABLE `dang_ky_lop` (
  `ma_dang_ky` int(11) NOT NULL,
  `mssv` varchar(10) NOT NULL,
  `ma_lop` varchar(10) NOT NULL,
  `ngay_dang_ky` datetime DEFAULT current_timestamp(),
  `trang_thai` enum('Da dang ky','Da huy') DEFAULT 'Da dang ky'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dang_ky_lop`
--

INSERT INTO `dang_ky_lop` (`ma_dang_ky`, `mssv`, `ma_lop`, `ngay_dang_ky`, `trang_thai`) VALUES
(4, '22521379', 'CE304', '2025-11-18 16:12:33', 'Da dang ky');

-- --------------------------------------------------------

--
-- Table structure for table `diem_danh`
--

CREATE TABLE `diem_danh` (
  `ma_diem_danh` int(11) NOT NULL,
  `mssv` varchar(20) NOT NULL,
  `ma_lop` varchar(10) NOT NULL,
  `thoi_gian_diem_danh` datetime NOT NULL,
  `ma_thiet_bi` varchar(64) NOT NULL DEFAULT 'pi5-cam-01',
  `do_tin_cay` tinyint(3) UNSIGNED DEFAULT NULL,
  `duong_dan_anh` varchar(255) DEFAULT NULL,
  `phien_ban_mo_hinh` varchar(32) DEFAULT NULL,
  `nguon_nhan_dien` enum('face') DEFAULT 'face',
  `trang_thai` enum('Hop le','Gian lan','Vang mat') DEFAULT 'Hop le'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `diem_danh`
--

INSERT INTO `diem_danh` (`ma_diem_danh`, `mssv`, `ma_lop`, `thoi_gian_diem_danh`, `ma_thiet_bi`, `do_tin_cay`, `duong_dan_anh`, `phien_ban_mo_hinh`, `nguon_nhan_dien`, `trang_thai`) VALUES
(35, '22521379', 'CE304', '2025-11-18 23:12:56', 'pi5-cam-01', NULL, NULL, NULL, 'face', 'Gian lan');

--
-- Triggers `diem_danh`
--
DELIMITER $$
CREATE TRIGGER `trg_canh_bao_gian_lan_AI` AFTER INSERT ON `diem_danh` FOR EACH ROW BEGIN
  IF NEW.trang_thai = 'Gian lan' THEN
    INSERT INTO canh_bao_gian_lan (ma_diem_danh, loai_canh_bao, mo_ta)
    VALUES (
      NEW.ma_diem_danh,
      CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM dang_ky_lop
          WHERE mssv = NEW.mssv AND ma_lop = NEW.ma_lop AND trang_thai = 'Da dang ky'
        )
        THEN 'Sinh vien khong co trong lop'
        ELSE 'Diem danh trung'
      END,
      CONCAT('SV ', NEW.mssv, ' lop ', NEW.ma_lop,
             CASE 
               WHEN NOT EXISTS (
                 SELECT 1 FROM dang_ky_lop
                 WHERE mssv = NEW.mssv AND ma_lop = NEW.ma_lop AND trang_thai = 'Da dang ky'
               ) THEN ' khong dang ky'
               ELSE ' diem danh trung trong khoang thoi gian ngan'
             END)
    );
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_dong_bo_lich_su` AFTER INSERT ON `diem_danh` FOR EACH ROW BEGIN
    INSERT INTO lich_su_diem_danh (
        mssv, ho_ten, lop, so_dien_thoai, ngay_sinh, gioi_tinh,
        thoi_gian_diem_danh, ma_lop, trang_thai_diem_danh,
        ma_thiet_bi, do_tin_cay, duong_dan_anh, phien_ban_mo_hinh
    )
    SELECT
        s.mssv, s.ho_ten, s.lop, s.so_dien_thoai, s.ngay_sinh, s.gioi_tinh,
        NEW.thoi_gian_diem_danh, NEW.ma_lop, NEW.trang_thai,
        NEW.ma_thiet_bi, NEW.do_tin_cay, NEW.duong_dan_anh, NEW.phien_ban_mo_hinh
    FROM sinh_vien s
    WHERE s.mssv = NEW.mssv;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_kiem_tra_gian_lan_BI` BEFORE INSERT ON `diem_danh` FOR EACH ROW BEGIN
  DECLARE sinh_vien_trong_lop INT DEFAULT 0;
  DECLARE diem_danh_trung INT DEFAULT 0;

  -- SV c� ��ng k? l?p kh�ng?
  SELECT COUNT(*) INTO sinh_vien_trong_lop
  FROM dang_ky_lop
  WHERE mssv = NEW.mssv
    AND ma_lop = NEW.ma_lop
    AND trang_thai = 'Da dang ky';

  -- C� �i?m danh tr�ng trong 5 ph�t kh�ng?
  SELECT COUNT(*) INTO diem_danh_trung
  FROM diem_danh
  WHERE mssv = NEW.mssv
    AND ma_lop = NEW.ma_lop
    AND ABS(TIMESTAMPDIFF(MINUTE, thoi_gian_diem_danh, NEW.thoi_gian_diem_danh)) <= 5;

  IF sinh_vien_trong_lop = 0 OR diem_danh_trung > 0 THEN
    SET NEW.trang_thai = 'Gian lan';
  ELSE
    -- N?u �? m?c �?nh th? b? d?ng n�y; th�m �? r? r�ng
    SET NEW.trang_thai = COALESCE(NEW.trang_thai, 'Hop le');
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `giang_vien`
--

CREATE TABLE `giang_vien` (
  `ma_giang_vien` varchar(10) NOT NULL,
  `ho_ten` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `so_dien_thoai` varchar(15) DEFAULT NULL,
  `mat_khau` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lich_su_canh_bao`
--

CREATE TABLE `lich_su_canh_bao` (
  `ma_lich_su` int(11) NOT NULL,
  `ma_canh_bao` int(11) NOT NULL,
  `hanh_dong` enum('Tao canh bao','Xac minh','Xu ly','Bo qua') NOT NULL,
  `mo_ta` text DEFAULT NULL,
  `thoi_gian` datetime DEFAULT current_timestamp(),
  `ma_giang_vien_thuc_hien` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lich_su_diem_danh`
--

CREATE TABLE `lich_su_diem_danh` (
  `ma_lich_su` int(11) NOT NULL,
  `mssv` varchar(20) NOT NULL,
  `ho_ten` varchar(100) NOT NULL,
  `lop` varchar(20) DEFAULT NULL,
  `so_dien_thoai` varchar(15) DEFAULT NULL,
  `ngay_sinh` date DEFAULT NULL,
  `gioi_tinh` enum('Nam','Nu','Khac') DEFAULT NULL,
  `thoi_gian_diem_danh` datetime NOT NULL,
  `ma_lop` varchar(10) NOT NULL,
  `trang_thai_diem_danh` enum('Hop le','Gian lan','Vang mat') DEFAULT 'Hop le',
  `ma_thiet_bi` varchar(64) DEFAULT NULL,
  `do_tin_cay` tinyint(3) UNSIGNED DEFAULT NULL,
  `duong_dan_anh` varchar(255) DEFAULT NULL,
  `phien_ban_mo_hinh` varchar(32) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lop_hoc`
--

CREATE TABLE `lop_hoc` (
  `ma_lop` varchar(10) NOT NULL,
  `ten_mon_hoc` varchar(100) NOT NULL,
  `phong_hoc` varchar(20) DEFAULT NULL,
  `thoi_gian_bat_dau` time DEFAULT NULL,
  `thoi_gian_ket_thuc` time DEFAULT NULL,
  `ma_giang_vien` varchar(10) DEFAULT NULL
) ;

--
-- Dumping data for table `lop_hoc`
--

INSERT INTO `lop_hoc` (`ma_lop`, `ten_mon_hoc`, `phong_hoc`, `thoi_gian_bat_dau`, `thoi_gian_ket_thuc`, `ma_giang_vien`) VALUES
('CE304', 'Đồ án 2', 'C111', '13:45:00', '16:15:00', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sinh_vien`
--

CREATE TABLE `sinh_vien` (
  `mssv` varchar(10) NOT NULL,
  `ho_ten` varchar(100) NOT NULL,
  `lop` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `so_dien_thoai` varchar(15) DEFAULT NULL,
  `ngay_sinh` date DEFAULT NULL,
  `gioi_tinh` enum('Nam','Nu','Khac') DEFAULT 'Nam',
  `khoa_hoc` varchar(10) DEFAULT NULL,
  `khoa` varchar(100) DEFAULT NULL,
  `nganh_hoc` varchar(100) DEFAULT NULL,
  `trang_thai` enum('Dang hoc','Da nghi','Bao luu') DEFAULT 'Dang hoc',
  `tao_luc` timestamp NOT NULL DEFAULT current_timestamp(),
  `cap_nhat_luc` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sinh_vien`
--

INSERT INTO `sinh_vien` (`mssv`, `ho_ten`, `lop`, `email`, `so_dien_thoai`, `ngay_sinh`, `gioi_tinh`, `khoa_hoc`, `khoa`, `nganh_hoc`, `trang_thai`, `tao_luc`, `cap_nhat_luc`) VALUES
('22521379', 'Thái Trường Thi', 'KTMT2022.2', 'thithai286@gmail.com', '0855816826', '2004-11-15', 'Nam', 'K17', 'Kỹ thuật máy tính', 'Kỹ thuật máy tính', 'Dang hoc', '2025-11-18 09:11:39', '2025-11-18 09:11:39');

-- --------------------------------------------------------

--
-- Table structure for table `thiet_bi`
--

CREATE TABLE `thiet_bi` (
  `ma_thiet_bi` varchar(64) NOT NULL COMMENT 'ID duy nhất của Pi (ví dụ: MAC address)',
  `ten_thiet_bi` varchar(100) NOT NULL COMMENT 'Tên gợi nhớ (Vd: Pi phòng C115)',
  `phong_hoc` varchar(50) DEFAULT NULL COMMENT 'Phòng học thiết bị được gán',
  `api_key` varchar(128) NOT NULL COMMENT 'Khóa bí mật để Pi xác thực với Server Flask',
  `trang_thai` enum('Online','Offline','Error') NOT NULL DEFAULT 'Offline',
  `last_seen` timestamp NULL DEFAULT NULL COMMENT 'Lần cuối cùng Pi gửi tín hiệu'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `thoi_khoa_bieu`
--

CREATE TABLE `thoi_khoa_bieu` (
  `ma_tiet_hoc` int(11) NOT NULL,
  `ma_lop` varchar(10) NOT NULL COMMENT 'Khóa ngoại đến lop_hoc',
  `phong_hoc` varchar(50) NOT NULL COMMENT 'Phòng học của tiết này',
  `thu_trong_tuan` tinyint(1) NOT NULL COMMENT '2=Thứ Hai, 3=Thứ Ba, ..., 8=Chủ Nhật',
  `gio_bat_dau` time NOT NULL,
  `gio_ket_thuc` time NOT NULL,
  `ngay_bat_dau_hoc` date NOT NULL COMMENT 'Ngày bắt đầu học kỳ',
  `ngay_ket_thuc_hoc` date NOT NULL COMMENT 'Ngày kết thúc học kỳ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vector_khuon_mat`
--

CREATE TABLE `vector_khuon_mat` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `mssv` varchar(10) NOT NULL COMMENT 'Sinh viên sở hữu vector này',
  `vector_encoding` blob NOT NULL COMMENT 'Vector 128D của dlib, lưu dưới dạng BLOB',
  `phien_ban_mo_hinh` varchar(32) NOT NULL COMMENT 'Phiên bản của mô hình đã tạo ra vector này',
  `tao_luc` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_diem_danh_moi_nhat_trong_ngay`
-- (See below for the actual view)
--
CREATE TABLE `v_diem_danh_moi_nhat_trong_ngay` (
`ma_diem_danh` int(11)
,`mssv` varchar(20)
,`ma_lop` varchar(10)
,`thoi_gian_diem_danh` datetime
,`ma_thiet_bi` varchar(64)
,`do_tin_cay` tinyint(3) unsigned
,`duong_dan_anh` varchar(255)
,`phien_ban_mo_hinh` varchar(32)
,`nguon_nhan_dien` enum('face')
,`trang_thai` enum('Hop le','Gian lan','Vang mat')
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_students`
-- (See below for the actual view)
--
CREATE TABLE `v_students` (
`mssv` varchar(10)
,`ho_ten` varchar(100)
,`lop_hanh_chinh` varchar(20)
,`khoa` varchar(100)
,`email` varchar(100)
);

-- --------------------------------------------------------

--
-- Structure for view `v_diem_danh_moi_nhat_trong_ngay`
--
DROP TABLE IF EXISTS `v_diem_danh_moi_nhat_trong_ngay`;

CREATE ALGORITHM=UNDEFINED DEFINER=`thith`@`localhost` SQL SECURITY DEFINER VIEW `v_diem_danh_moi_nhat_trong_ngay`  AS SELECT `d`.`ma_diem_danh` AS `ma_diem_danh`, `d`.`mssv` AS `mssv`, `d`.`ma_lop` AS `ma_lop`, `d`.`thoi_gian_diem_danh` AS `thoi_gian_diem_danh`, `d`.`ma_thiet_bi` AS `ma_thiet_bi`, `d`.`do_tin_cay` AS `do_tin_cay`, `d`.`duong_dan_anh` AS `duong_dan_anh`, `d`.`phien_ban_mo_hinh` AS `phien_ban_mo_hinh`, `d`.`nguon_nhan_dien` AS `nguon_nhan_dien`, `d`.`trang_thai` AS `trang_thai` FROM (`diem_danh` `d` join (select `mssv` AS `mssv`,`ma_lop` AS `ma_lop`,max(`thoi_gian_diem_danh`) AS `lan_cuoi` from `diem_danh` where cast(`thoi_gian_diem_danh` as date) = curdate() group by `mssv`,`ma_lop`) `x` on(`x`.`mssv` = `d`.`mssv` and `x`.`ma_lop` = `d`.`ma_lop` and `x`.`lan_cuoi` = `d`.`thoi_gian_diem_danh`)) ;

-- --------------------------------------------------------

--
-- Structure for view `v_students`
--
DROP TABLE IF EXISTS `v_students`;

CREATE ALGORITHM=UNDEFINED DEFINER=`thith`@`localhost` SQL SECURITY DEFINER VIEW `v_students`  AS SELECT `sinh_vien`.`mssv` AS `mssv`, `sinh_vien`.`ho_ten` AS `ho_ten`, `sinh_vien`.`lop` AS `lop_hanh_chinh`, coalesce(`sinh_vien`.`khoa`,`sinh_vien`.`khoa_hoc`) AS `khoa`, `sinh_vien`.`email` AS `email` FROM `sinh_vien` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `anh_khuon_mat`
--
ALTER TABLE `anh_khuon_mat`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_akm_mssv` (`mssv`);

--
-- Indexes for table `canh_bao_gian_lan`
--
ALTER TABLE `canh_bao_gian_lan`
  ADD PRIMARY KEY (`ma_canh_bao`),
  ADD KEY `fk_cb_dd` (`ma_diem_danh`),
  ADD KEY `fk_cb_gv` (`ma_giang_vien_xu_ly`),
  ADD KEY `idx_cb_trang_thai` (`trang_thai`);

--
-- Indexes for table `cong_viec_huan_luyen`
--
ALTER TABLE `cong_viec_huan_luyen`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cvhl_trang_thai` (`trang_thai`);

--
-- Indexes for table `dang_ky_lop`
--
ALTER TABLE `dang_ky_lop`
  ADD PRIMARY KEY (`ma_dang_ky`),
  ADD UNIQUE KEY `uk_dk` (`mssv`,`ma_lop`),
  ADD KEY `idx_dk_mssv` (`mssv`),
  ADD KEY `idx_dk_malop` (`ma_lop`);

--
-- Indexes for table `diem_danh`
--
ALTER TABLE `diem_danh`
  ADD PRIMARY KEY (`ma_diem_danh`),
  ADD KEY `idx_dd_mssv` (`mssv`),
  ADD KEY `idx_dd_malop` (`ma_lop`),
  ADD KEY `idx_dd_time` (`thoi_gian_diem_danh`);

--
-- Indexes for table `giang_vien`
--
ALTER TABLE `giang_vien`
  ADD PRIMARY KEY (`ma_giang_vien`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_gv_email` (`email`);

--
-- Indexes for table `lich_su_canh_bao`
--
ALTER TABLE `lich_su_canh_bao`
  ADD PRIMARY KEY (`ma_lich_su`),
  ADD KEY `fk_lscb_cb` (`ma_canh_bao`),
  ADD KEY `fk_lscb_gv` (`ma_giang_vien_thuc_hien`),
  ADD KEY `idx_lscb_time` (`thoi_gian`);

--
-- Indexes for table `lich_su_diem_danh`
--
ALTER TABLE `lich_su_diem_danh`
  ADD PRIMARY KEY (`ma_lich_su`),
  ADD KEY `idx_lsd_mssv` (`mssv`),
  ADD KEY `idx_lsd_thoigian` (`thoi_gian_diem_danh`),
  ADD KEY `idx_lsd_malop` (`ma_lop`);

--
-- Indexes for table `lop_hoc`
--
ALTER TABLE `lop_hoc`
  ADD PRIMARY KEY (`ma_lop`),
  ADD KEY `idx_lh_gv` (`ma_giang_vien`);

--
-- Indexes for table `sinh_vien`
--
ALTER TABLE `sinh_vien`
  ADD PRIMARY KEY (`mssv`),
  ADD KEY `idx_sv_lop` (`lop`),
  ADD KEY `idx_sv_email` (`email`);

--
-- Indexes for table `thiet_bi`
--
ALTER TABLE `thiet_bi`
  ADD PRIMARY KEY (`ma_thiet_bi`),
  ADD UNIQUE KEY `uk_api_key` (`api_key`);

--
-- Indexes for table `thoi_khoa_bieu`
--
ALTER TABLE `thoi_khoa_bieu`
  ADD PRIMARY KEY (`ma_tiet_hoc`),
  ADD KEY `fk_tkb_lop` (`ma_lop`),
  ADD KEY `idx_tkb_phong_thu_gio` (`phong_hoc`,`thu_trong_tuan`,`gio_bat_dau`,`gio_ket_thuc`);

--
-- Indexes for table `vector_khuon_mat`
--
ALTER TABLE `vector_khuon_mat`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_vkm_sv` (`mssv`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `anh_khuon_mat`
--
ALTER TABLE `anh_khuon_mat`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `canh_bao_gian_lan`
--
ALTER TABLE `canh_bao_gian_lan`
  MODIFY `ma_canh_bao` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `cong_viec_huan_luyen`
--
ALTER TABLE `cong_viec_huan_luyen`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dang_ky_lop`
--
ALTER TABLE `dang_ky_lop`
  MODIFY `ma_dang_ky` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `diem_danh`
--
ALTER TABLE `diem_danh`
  MODIFY `ma_diem_danh` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `lich_su_canh_bao`
--
ALTER TABLE `lich_su_canh_bao`
  MODIFY `ma_lich_su` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lich_su_diem_danh`
--
ALTER TABLE `lich_su_diem_danh`
  MODIFY `ma_lich_su` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `thoi_khoa_bieu`
--
ALTER TABLE `thoi_khoa_bieu`
  MODIFY `ma_tiet_hoc` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vector_khuon_mat`
--
ALTER TABLE `vector_khuon_mat`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `anh_khuon_mat`
--
ALTER TABLE `anh_khuon_mat`
  ADD CONSTRAINT `fk_akm_sv` FOREIGN KEY (`mssv`) REFERENCES `sinh_vien` (`mssv`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `canh_bao_gian_lan`
--
ALTER TABLE `canh_bao_gian_lan`
  ADD CONSTRAINT `fk_cb_dd` FOREIGN KEY (`ma_diem_danh`) REFERENCES `diem_danh` (`ma_diem_danh`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cb_gv` FOREIGN KEY (`ma_giang_vien_xu_ly`) REFERENCES `giang_vien` (`ma_giang_vien`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `dang_ky_lop`
--
ALTER TABLE `dang_ky_lop`
  ADD CONSTRAINT `fk_dk_lop` FOREIGN KEY (`ma_lop`) REFERENCES `lop_hoc` (`ma_lop`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dk_sv` FOREIGN KEY (`mssv`) REFERENCES `sinh_vien` (`mssv`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `diem_danh`
--
ALTER TABLE `diem_danh`
  ADD CONSTRAINT `fk_dd_lop` FOREIGN KEY (`ma_lop`) REFERENCES `lop_hoc` (`ma_lop`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_diem_danh__sv__cscd` FOREIGN KEY (`mssv`) REFERENCES `sinh_vien` (`mssv`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `lich_su_canh_bao`
--
ALTER TABLE `lich_su_canh_bao`
  ADD CONSTRAINT `fk_lscb_cb` FOREIGN KEY (`ma_canh_bao`) REFERENCES `canh_bao_gian_lan` (`ma_canh_bao`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lscb_gv` FOREIGN KEY (`ma_giang_vien_thuc_hien`) REFERENCES `giang_vien` (`ma_giang_vien`) ON UPDATE CASCADE;

--
-- Constraints for table `lich_su_diem_danh`
--
ALTER TABLE `lich_su_diem_danh`
  ADD CONSTRAINT `fk_lich_su_dd__sv__cscd` FOREIGN KEY (`mssv`) REFERENCES `sinh_vien` (`mssv`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lsd_lop` FOREIGN KEY (`ma_lop`) REFERENCES `lop_hoc` (`ma_lop`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `lop_hoc`
--
ALTER TABLE `lop_hoc`
  ADD CONSTRAINT `fk_lh_gv` FOREIGN KEY (`ma_giang_vien`) REFERENCES `giang_vien` (`ma_giang_vien`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
