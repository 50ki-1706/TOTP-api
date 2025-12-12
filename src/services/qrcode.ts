import QRCode from "qrcode";

/**
 * QRコードをData URL形式で生成
 * 
 * @param text QRコードに埋め込むテキスト（TOTP URI）
 * @returns Data URL (data:image/png;base64,...)
 */
export async function generateQRCode(text: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return qrCodeDataUrl;
  } catch (error) {
    console.error("QR Code generation error:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * QRコードをSVG形式で生成
 */
export async function generateQRCodeSVG(text: string): Promise<string> {
  try {
    const qrCodeSVG = await QRCode.toString(text, {
      type: "svg",
      width: 300,
      margin: 2,
    });

    return qrCodeSVG;
  } catch (error) {
    console.error("QR Code SVG generation error:", error);
    throw new Error("Failed to generate QR code SVG");
  }
}
