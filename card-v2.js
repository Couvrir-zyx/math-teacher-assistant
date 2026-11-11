export function downloadFeedbackCard({ studentName, topic, course, date, level, group, feedback }) {
  const width = 1600;
  const pad = 112;
  const innerWidth = width - pad * 2;
  const bodyFont = 34;
  const lineHeight = 61;

  const measure = document.createElement("canvas").getContext("2d");
  measure.font = `400 ${bodyFont}px "Microsoft YaHei UI", "PingFang SC", sans-serif`;
  const lines = wrapText(measure, feedback, innerWidth);
  const height = 300 + lines.length * lineHeight + 120;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#f7f8fd");
  background.addColorStop(1, "#eef1fb");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 46, 42, width - 92, height - 84, 34);
  ctx.fill();

  ctx.fillStyle = "#526bdc";
  ctx.fillRect(112, 92, 54, 8);
  ctx.font = '700 22px "Microsoft YaHei UI", "PingFang SC", sans-serif';
  ctx.fillText("MATH TEACHING · CLASS FEEDBACK", 112, 145);

  ctx.fillStyle = "#172033";
  ctx.font = '700 52px "Microsoft YaHei UI", "PingFang SC", sans-serif';
  ctx.fillText(group ? "组课课堂反馈" : `${studentName} · 课堂反馈`, 112, 215);

  ctx.fillStyle = "#788196";
  ctx.font = '400 25px "Microsoft YaHei UI", "PingFang SC", sans-serif';
  ctx.fillText(`${date}  ·  ${course}  ·  ${topic}`, 112, 260);

  ctx.strokeStyle = "#e5e9f2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(112, 290);
  ctx.lineTo(width - 112, 290);
  ctx.stroke();

  ctx.fillStyle = "#2b354b";
  ctx.font = `400 ${bodyFont}px "Microsoft YaHei UI", "PingFang SC", sans-serif`;
  let y = 356;
  for (const line of lines) {
    const isHeading = /^【.+】$/.test(line.trim());
    if (isHeading) {
      y += 12;
      ctx.fillStyle = "#384fa8";
      ctx.font = `700 ${bodyFont}px "Microsoft YaHei UI", "PingFang SC", sans-serif`;
      ctx.fillText(line, 112, y);
      ctx.fillStyle = "#2b354b";
      ctx.font = `400 ${bodyFont}px "Microsoft YaHei UI", "PingFang SC", sans-serif`;
    } else {
      ctx.fillText(line, 112, y);
    }
    y += lineHeight;
  }

  ctx.fillStyle = "#8991a5";
  ctx.font = '400 22px "Microsoft YaHei UI", "PingFang SC", sans-serif';
  ctx.fillText(`${level}  ·  数学教师工作台`, 112, height - 82);

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `课堂反馈-${date}-${safeName(studentName)}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, "image/png");
}

function wrapText(ctx, text, maxWidth) {
  const output = [];
  const paragraphs = String(text || "").replace(/\r\n/g, "\n").split("\n");
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      output.push("");
      continue;
    }
    let line = "";
    for (const char of [...paragraph]) {
      const next = line + char;
      if (ctx.measureText(next).width > maxWidth && line) {
        output.push(line);
        line = char;
      } else {
        line = next;
      }
    }
    if (line) output.push(line);
  }
  return output;
}

function safeName(value) {
  return String(value || "组课").replace(/[\\/:*?"<>|]/g, "-");
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
