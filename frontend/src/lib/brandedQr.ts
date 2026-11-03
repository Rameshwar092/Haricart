import QRCode from "qrcode";

export async function generateBrandedHariCartQrDataUrl(text: string, size = 320): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#185c35", light: "#ffffff" },
  });

  if (typeof document === "undefined") {
    return qrDataUrl;
  }

  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const footerHeight = 44;
    canvas.width = size;
    canvas.height = size + footerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(qrDataUrl);
      return;
    }

    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    qrImg.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(qrImg, 0, 0, size, size);

      const centerSize = 48;
      const centerX = size / 2;
      const centerY = size / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerSize / 2 + 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#e2e8f0";
      ctx.stroke();
      ctx.restore();

      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, centerSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, centerX - centerSize / 2, centerY - centerSize / 2, centerSize, centerSize);
        ctx.restore();

        drawFooterAndResolve();
      };
      logoImg.onerror = () => {
        ctx.save();
        ctx.fillStyle = "#185c35";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("H", centerX, centerY);
        ctx.restore();

        drawFooterAndResolve();
      };
      logoImg.src = "/favicon.ico";
    };

    qrImg.onerror = () => {
      resolve(qrDataUrl);
    };

    qrImg.src = qrDataUrl;

    function drawFooterAndResolve() {
      const activeCtx = canvas.getContext("2d");
      if (!activeCtx) {
        resolve(canvas.toDataURL("image/png"));
        return;
      }

      activeCtx.fillStyle = "#f6f8f5";
      activeCtx.fillRect(0, size, size, footerHeight);

      activeCtx.strokeStyle = "#e2e8f0";
      activeCtx.lineWidth = 1;
      activeCtx.beginPath();
      activeCtx.moveTo(16, size);
      activeCtx.lineTo(size - 16, size);
      activeCtx.stroke();

      activeCtx.textAlign = "center";
      activeCtx.textBaseline = "middle";

      activeCtx.font = "bold 13px sans-serif";
      activeCtx.fillStyle = "#185c35";
      const footerText = "HariCart Fresh Vegetable";
      activeCtx.fillText(footerText, size / 2, size + footerHeight / 2);

      resolve(canvas.toDataURL("image/png"));
    }
  });
}
