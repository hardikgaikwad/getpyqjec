// pdf-lib is loaded on demand so it is not part of the Upload page bundle.
 const createPdfFromImages = async (images) => {
    const { PDFDocument } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();

    for (const imgFile of images) {
      const arrayBuffer = await imgFile.arrayBuffer();
      let img;
      if (imgFile.type === "image/png") {
        img = await pdfDoc.embedPng(arrayBuffer);
      } else {
        img = await pdfDoc.embedJpg(arrayBuffer);
      }
      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }

    const pdfBytes = await pdfDoc.save();
    return new File([pdfBytes], "converted_images.pdf", {
      type: "application/pdf",
    });
  };

  export default createPdfFromImages;