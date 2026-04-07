# Smart Attendance (React + Node + MySQL + Python Face)

## Cau hinh nhanh
1) Tao file .env theo mau trong moi thu muc:
   - backend-node/.env
   - frontend-react/.env
   - python-face/.env (tuy chon)

2) Chay backend:
   cd backend-node
   npm i
   npm run dev

3) Chay python-face (service nhan dien):
   cd python-face
   python3 -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   python service.py

4) Chay frontend:
   cd frontend-react
   npm i
   npm run dev

## Bien moi truong
- Backend:
  PORT=8080
  DB_HOST=127.0.0.1
  DB_PORT=3306
  DB_USER=your_user
  DB_PASSWORD=your_pass
  DB_NAME=diem_danh
  PYTHON_SERVICE_URL=http://127.0.0.1:5002
  JWT_SECRET=your_jwt_secret
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_USER=no-reply@example.com
  SMTP_PASS=app_password
  SMTP_FROM="Diem danh <no-reply@example.com>"

- Frontend:
  VITE_API_BASE=http://127.0.0.1:8080/api
  VITE_SOCKET_URL=http://127.0.0.1:8080

- Python-face:
  SERVICE_PORT=5002
  ENCODINGS_PATH=encodings.pickle

## Thu tu chay
- Import database/diem_danh.sql vao MySQL.
- Chay python-face truoc (service nhan dien).
- Chay backend, sau do frontend.

## Ghi chu
- UI hien thi chu khong dau.
- Checkin tu dong: python-face -> backend /api/diem-danh/checkin
- Checkout tu dong: python-face -> backend /api/diem-danh/checkout
