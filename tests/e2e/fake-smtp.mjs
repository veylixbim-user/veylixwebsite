// Minimal SMTP sink: accepts AUTH and messages, appends each message as one JSON line to mail.jsonl.
import net from "node:net";
import { appendFileSync } from "node:fs";
const out = process.argv[2];
net.createServer((sock) => {
  let data = false, authStep = 0, buf = "", msg = { from: "", to: [], body: "" };
  const w = (l) => sock.write(l + "\r\n");
  w("220 fake-smtp ready");
  sock.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    let i;
    while ((i = buf.indexOf("\r\n")) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (data) {
        if (line === ".") { data = false; appendFileSync(out, JSON.stringify(msg) + "\n"); msg = { from: "", to: [], body: "" }; w("250 queued"); }
        else msg.body += (line.startsWith("..") ? line.slice(1) : line) + "\n";
        continue;
      }
      const cmd = line.toUpperCase();
      if (authStep === 1) { authStep = 2; w("334 UGFzc3dvcmQ6"); continue; }
      if (authStep === 2) { authStep = 0; w("235 ok"); continue; }
      if (cmd.startsWith("EHLO")) { sock.write("250-fake\r\n250-AUTH PLAIN LOGIN\r\n250 SIZE 10000000\r\n"); }
      else if (cmd.startsWith("HELO")) w("250 fake");
      else if (cmd.startsWith("AUTH PLAIN")) w("235 ok");
      else if (cmd.startsWith("AUTH LOGIN")) { authStep = 1; w("334 VXNlcm5hbWU6"); }
      else if (cmd.startsWith("MAIL FROM")) { msg.from = line.slice(10); w("250 ok"); }
      else if (cmd.startsWith("RCPT TO")) { msg.to.push(line.slice(8)); w("250 ok"); }
      else if (cmd === "DATA") { data = true; w("354 go"); }
      else if (cmd === "QUIT") { w("221 bye"); sock.end(); }
      else if (cmd === "RSET" || cmd === "NOOP") w("250 ok");
      else w("250 ok");
    }
  });
  sock.on("error", () => {});
}).listen(2525, "127.0.0.1", () => console.log("fake smtp on 2525"));
