# 메타 픽셀 + 전환 API 세트 (unse-kid-career.vercel.app 용)

- `api/meta-capi.js` : 사이트 저장소의 `api/` 폴더에 넣으면 Vercel이 `/api/meta-capi` 주소로 자동으로 열어 줘요.
- `pixel-snippet.html` : 사이트 `<head>` 맨 위에 붙이는 픽셀 코드. `PIXEL_ID` 두 군데를 픽셀 번호로 바꿔요.

## Vercel 환경 변수 (Settings → Environment Variables)
| 이름 | 값 |
|---|---|
| META_PIXEL_ID | 픽셀 번호 |
| META_CAPI_TOKEN | 이벤트 관리자에서 만든 전환 API 토큰 (채팅에 붙이지 말 것) |
| META_TEST_EVENT_CODE | (테스트할 때만) 이벤트 관리자 "테스트 이벤트" 탭의 코드. 테스트 끝나면 지우기 |

추가한 뒤에는 Deployments → 최신 배포 → Redeploy 해야 적용돼요.

## 보내는 이벤트
PageView, ViewContent, Lead, InitiateCheckout, Purchase. 브라우저 픽셀과 서버가 같은 event_id로 보내서 메타가 중복 없이 한 번으로 셉니다.
전화번호를 넘기면 서버에서 해시(암호화)해서만 보내요. 원래 번호는 메타로 가지 않아요.

## 알아 둘 점
- 구매(Purchase)는 결제 완료 화면에서 보내는 방식이라, 결제사(페이앱 등)가 서버로 알려주는 기능(feedbackurl)이 있으면 그쪽에서 보내는 게 더 정확해요. 사이트 코드를 보고 맞춰 넣을게요.
