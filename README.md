
<img width="692" height="63" alt="image (1)" src="https://github.com/user-attachments/assets/88f6ae9c-9393-4d69-925b-b295bdbafadb" />

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



# 📈구성 화면 및 기능

## 🏠 HOME


https://github.com/user-attachments/assets/3e3314c6-26fe-402d-bd4b-f5a709a4f8f0




- 전체 웹사이트는 **HOME**, **Documents**, **GroupSign**의 세 가지 페이지로 구성되어 있으며, 그중 첫 화면은 랜딩 페이지 역할을 하는 **HOME**이다.

## 🔒 Login / Logout


https://github.com/user-attachments/assets/4b900d28-cb85-45b6-a4fc-8a99fb153122








- 구글 OAuth 2.0을 이용한 간편 로그인 기능을 제공한다.

## ✍️ Custom & Make Signature

https://github.com/user-attachments/assets/2a5bd125-c2cf-434f-85f5-ab1eba637951

- 사용자는 자신의 계정에 마우스 커서를 이용해 커스텀 서명을 직접 그려 저장할 수 있다.
    
    저장된 서명은 언제든 삭제할 수 있으며, 뒤에서 AI 기반 서명 기능과 모바일 서명 기능도 소개한다.
    

## 🤖 Make Signature Using AI

[화면 기록 2025-07-16 오후 3.42.44.mov](attachment:85b80bb0-9d2a-484d-9440-f79a39abc20c:화면_기록_2025-07-16_오후_3.42.44.mov)

- **Gemini AI를 활용해 서명을 자동으로 생성해주는 기능이다.**
    
    사용자가 자신의 이름을 한국어 또는 영어로 입력하면, AI가 이를 바탕으로 커스텀 사인 디자인을 제공한다.
    

## 👥 Make a Group

[화면 기록 2025-07-16 오후 3.28.51.mov](attachment:47291ca0-cd8e-4ea0-9b7d-efa39a4bcf44:화면_기록_2025-07-16_오후_3.28.51.mov)

- **PDF, JPG, PNG 파일을 업로드할 수 있으며, 구성원의 이름, 이메일, 역할 정보를 입력하여 그룹원을 추가할 수 있다. 모든 구성원을 추가한 후 ‘확정하기’ 버튼을 누르면 그룹 서명 문서가 생성되며, 공유 가능한 URL도 함께 제공된다.**
    
    해당 URL을 통해 그룹원들이 문서에 접근할 수 있으며, 로그인하지 않아도 서명이 가능하다. 또한, 입력된 이메일 주소로 서명 요청 메일이 자동으로 전송된다.
    

![스크린샷 2025-07-16 오후 4.57.16.png](attachment:45ee4791-f78f-45ed-8bd6-6a8a251260b8:스크린샷_2025-07-16_오후_4.57.16.png)

                                                                     (실제 이메일 요청 양식)

## 📄My Documents

[화면 기록 2025-07-16 오후 7.05.23.mov](attachment:9971b5a1-e28e-4391-aa98-28d46920b512:화면_기록_2025-07-16_오후_7.05.23.mov)

내가 속한 모든 그룹 문서들을 조회할 수 있다.
그룹 마다 몇명이 사인했는지 확인할 수 있고 서명이 완료된 PDF는 조회 및 다운로드가 가능하다!

또한 그룹 문서 삭제 또한 가능하다.

## 🖊️Group Signature & Insert Signature

[화면 기록 2025-07-16 오후 4.04.52.mov](attachment:6675cfc2-16e0-4745-83e3-8364e4fa8e3c:화면_기록_2025-07-16_오후_4.04.52.mov)

- **공유 URL에 접속하면 ‘Signature’ 버튼을 통해 바로 서명을 추가할 수 있으며, 저장된 커스텀 사인을 클릭하여 손쉽게 삽입할 수 있다.**
    
    추가된 서명은 자유롭게 드래그하여 위치를 조정할 수 있고, 문서의 확대/축소 및 패닝 기능도 지원된다.
    
    서명이 완료된 후에는 체크박스를 선택하여 문서에 서명을 최종적으로 병합할 수 있다.
    

---

# 😋2주차 몰입 후기

## 백재호

- @하승원 씨가 현실에서 겪은 문제점을 통해 얻어낸 아이디어가 너무 좋았다.
- 현실에서 사용자들이 실생활에서 충분히 사용할 만한 웹사이트를 개발한 것 같아 뿌듯하다.
- 웹 개발이 처음이라 초반에 헤멨지만, 백엔드는 생각보다 할만했던 것 같다. 승원이형이 천천히 기다려주고 알려준 덕분에 잘 완성한 것 같다.
- 프론트는 아직도 뭐가 어떻게 돌아가는건지 잘 이해가 안간다. 승원이형에게 리스펙🫡을 표한다. 특히나 UI와 애니메이션 효과를 이쁘게 꾸민 덕분에 우리 웹이 더욱 빛나는 것 같다.
- 생각보다 Cursor는 엉뚱한 코드만 만들어낸다~
- railway 등 다양한 배포 플랫폼이 정말 잘 되어있다.
- 다음(생)엔 프론트도 경험해보고 싶다.

## 하승원

- 평소에 불편했던 일상 문제를 팀원과 함께 직접개발함으로써 해결할 수 있어서 좋았습니다.
- 프론트를 맡아서 2인으로 개발하는 경험은 이번이 처음이었는데 백엔드에서 최선을 다해준 팀메이트 재호 덕분에 다행히 잘 마무리할 수 있었습니다 … 고맙습니다..~
- 조금 더 디벨롭해서 실제로 운영까지 해보고 싶습니다!
- AI가 ~~너무 많이~~ 도와줬어요.

