# แนวสอบ Final Mechanical Materials

หน้าเว็บสรุปแนวข้อสอบ Final (Week 11–16) จับคู่คลิปทบทวนของอาจารย์กับสไลด์ บอกว่าหัวข้อไหนออกสอบ ไม่ออก และควรเน้นตรงไหน

เป็น static site ไม่มีขั้นตอน build

| หน้า | ไฟล์ | URL |
| --- | --- | --- |
| แนวสอบ Final Mechanical Materials | `index.html` | `/` |
| สรุปสอบ Final TC4 (Thai Culture/Social Studies 4) | `tc4/index.html` + `tc4/img/` | `/tc4/` |

หน้า TC4 อ่านแบบเลื่อนยาวหรือกด **โหมดสไลด์** (← → / ปัดจอ) ได้

## ดูในเครื่อง

```bash
npx -y serve .
```

แล้วเปิด http://localhost:3000

## Deploy บน Render

- **Blueprint:** New → Blueprint → เลือก repo นี้ (ใช้ค่าจาก `render.yaml`)
- **หรือ Static Site:** Build Command `echo ok`, Publish Directory `.`
