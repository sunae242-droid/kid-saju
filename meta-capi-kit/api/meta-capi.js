// Vercel 서버 함수: 브라우저 픽셀과 같은 이벤트를 메타 전환 API로 한 번 더 보냅니다.
// 필요한 환경 변수: META_PIXEL_ID, META_CAPI_TOKEN
// 선택: META_TEST_EVENT_CODE (이벤트 관리자 "테스트 이벤트" 코드), META_GRAPH_VERSION (기본 v23.0)
const crypto = require("crypto");

const ALLOWED = new Set(["PageView", "ViewContent", "Lead", "InitiateCheckout", "AddPaymentInfo", "Purchase"]);

function readCookie(header, name) {
  const m = new RegExp("(?:^|;\\s*)" + name + "=([^;]+)").exec(header || "");
  return m ? decodeURIComponent(m[1]) : undefined;
}

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");

// 전화번호는 숫자만 남기고 국가번호(82)를 붙여 해시합니다. 원문은 메타로 보내지 않아요.
function hashPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return undefined;
  if (d.startsWith("0")) d = "82" + d.slice(1);
  return sha256(d);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) return res.status(500).json({ ok: false, error: "META_PIXEL_ID / META_CAPI_TOKEN 환경 변수가 없어요" });

  // 다른 사이트에서 가짜 이벤트를 보내지 못하게, 같은 주소에서 온 요청만 받습니다.
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = req.headers.origin || req.headers.referer || "";
  let originHost = "";
  try { originHost = new URL(origin).host; } catch {}
  if (host && origin && originHost !== host) return res.status(403).json({ ok: false });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { event_name, event_id, event_source_url, custom_data, phone } = body || {};
  if (!ALLOWED.has(event_name) || !event_id) return res.status(400).json({ ok: false });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress;
  const cookie = req.headers.cookie;
  const user_data = {
    client_ip_address: ip,
    client_user_agent: req.headers["user-agent"],
    fbp: readCookie(cookie, "_fbp"),
    fbc: readCookie(cookie, "_fbc"),
    ph: hashPhone(phone),
  };
  Object.keys(user_data).forEach((k) => user_data[k] === undefined && delete user_data[k]);

  const payload = {
    data: [{
      event_name,
      event_id: String(event_id),
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: event_source_url || origin,
      user_data,
      custom_data: custom_data || undefined,
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

  const ver = process.env.META_GRAPH_VERSION || "v23.0";
  try {
    const r = await fetch(`https://graph.facebook.com/${ver}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await r.json().catch(() => ({}));
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, events_received: out.events_received, error: out.error && out.error.message });
  } catch (e) {
    return res.status(502).json({ ok: false, error: "메타 서버에 연결하지 못했어요" });
  }
};
