

https://github.com/user-attachments/assets/39cc27d4-af8d-48e6-907b-fafa72cf81f9

# 👤 팀원

## **💁** 백재호

[백재호](https://www.notion.so/2205a1b835578068aed7e733c2777125?pvs=21)

- 카이스트 전산학부 23학번
- Backend
- jeeno816@kaist.ac.kr
- https://github.com/jeeno816

## **💁🏻** 하승원

[하승원](https://www.notion.so/2215a1b8355780fa855bcc8bdd1c72a3?pvs=21)

- 부산대학교 정보컴퓨터공학부 20학번
- Frontend
- hasw3314@gmail.com
- https://github.com/won2eu


# 💭기획

🤔전자문서(PDF)에 서명을 할 일이 생겼을때 어떻게 하시나요?

→ 귀찮게 매번 파일을 태블릿 pc에서 서명한 후 다시 컴퓨터로 옮긴다. 

❓만약 여러 사람이 서명을 해야한다면?

→ ✉️ 메일로 PDF를 순서대로 보내면서 서명받는다.

⇒ 😮‍💨 하.. 귀찮아..

👉 한 사람이 PDF를 업로드 하고 공유URL을 통해 그룹 문서 생성!

캬~ 모든 사람이 이 주소를 통해 접속하여 마우스 커서로 쉽고 빠르게 서명 삽입!!



# 🔌 기술스택

## 🖥️ Frontend 기술 스택

| 기술명 | 설명 |
| --- | --- |
| Next.js | React 기반 프레임워크 |
| **TypeScript** | 언어 |
| **Tailwind CSS** | CSS 프레임워크 |
| **Framer Motion** | React Animation 라이브러리 |
| **signature canvas** | React Canvas 라이브러리 |
| GSAP | 고성능 애니메이션을 위한 자바스크립트 라이브러리 |
| Vercel | Next.js 공식 배포 플랫폼 |

## 🤖 Backend 기술 스택

| 기술명 | 설명 |
| --- | --- |
| FastAPI | Backend Framework |
| **PostgreSQL** | DataBase |
| WebSocket | 실시간 모바일과 컴퓨터 연결 |
| Google Oauth 2.0 | 구글 로그인 API |
| Gemini API | AI 서명 생성 기능 구현 |
| **Railway** | 배포 플랫폼 |


| 기능ID | 기능명 | Method | **URL** | 내용 | 진행 상황 |
| --- | --- | --- | --- | --- | --- |
| 1 | GOOGLE로 로그인 | GET | /auth/google/login | 구글 auth 로 redirect하게 만듦 | 완료 |
| 2 | 로그아웃 | GET | /auth/logout | 쿠키에 저장된 JWT삭제 | 완료 |
| 3 | google로 로그인 콜백 | GET | /auth/google/callback | code → 로그인 정보 바탕으로 쿠키로 JWT저장 | 완료 |
| 4 | 계정정보 | GET | /auth/me | 계정 정보(이메일 등 반환) | 완료 |
| 5 | 사인 드로우 업로드 | POST | /upload/sign/draw | 캔버스에 사인 마우스로 그린거 base64로 업로드 | 완료 |
| 6 | PDF문서 업로드 | POST | /upload/docs/pdf | pdf문서와 구성원 목록 업로드 pdf문서 조회링크 반환 | 완료 |
| 7 | pdf문서 | GET | /resources/docs/{doc_filename} | pdf문서 반환 | 완료 |
| 8 | 사인 이미지 | GET | /resources/signs/{sign_filename} | 사인 이미지 반환 | 완료 |
| 9 | pdf문서 삭제 | DELETE | /documents/{doc_filename} |  | 완료 |
| 10 | 사인 삭제 | DELETE | /signs/{이미지파일이름} |  | 완료 |
| 11 | 업로드한 pdf문서들 정보 | GET | /documents | json형태로 반환 | 완료 |
| 12 | 사용자의 서명들 | GET | /signs | json형태로 반환 | 완료 |
| 13 | AI서명 생성 | GET | /signs/generate/{name} | name으로 생성된 서명이미지를 Base64로 반환 | 완료 |
| 14 | 사인 문서에 삽입 | POST | /documents/{doc_filename}/sign/{signer_id} | 문서에 서명들 삽입 ([서명 이미지 base64,위치값과 비율,페이지번호]의 리스트 형태로 입력) | 완료 |
| 15 | 문서 정보 조회 | GET | /documents/{doc_filename} | 문서 원본 파일 이름, url, 생성날자 등 반환 | 완료 |
| 16 | 문서 구성원 조회 | GET | /documents/{doc_filename}/signer | 구성원 정보 조회 | 완료 |



#구현 영상 

