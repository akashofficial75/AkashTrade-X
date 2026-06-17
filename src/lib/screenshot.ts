import html2canvas from 'html2canvas';

export const takeScreenshot = async (element) => {
  const canvas = await html2canvas(element);
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'chart.png';
  a.click();
}
