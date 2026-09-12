# แนวสอบ Final Mechanical Materials

หน้าเว็บสรุปแนวข้อสอบ Final (Week 11–16) จับคู่คลิปทบทวนของอาจารย์กับสไลด์ บอกว่าหัวข้อไหนออกสอบ ไม่ออก และควรเน้นตรงไหน

เป็น static site ไฟล์เดียว (`index.html`) ไม่มีขั้นตอน build

## ดูในเครื่อง

```bash
npx -y serve .
```

แล้วเปิด http://localhost:3000

## Deploy บน Render

- **Blueprint:** New → Blueprint → เลือก repo นี้ (ใช้ค่าจาก `render.yaml`)
- **หรือ Static Site:** Build Command `echo ok`, Publish Directory `.`
