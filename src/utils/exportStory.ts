import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { StoryBook } from '../types';

/**
 * Convert image URL to Data URL for PDF embedding
 */
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  try {
    if (imageUrl.startsWith('data:image/')) {
      return imageUrl;
    }
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not convert image to base64 for PDF:', err);
    return null;
  }
}

/**
 * Export full storybook as a beautifully styled PDF
 */
export async function exportStoryToPDF(book: StoryBook): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // --- COVER PAGE ---
  // Background fill
  doc.setFillColor(249, 247, 242);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative border
  doc.setDrawColor(218, 209, 196);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin - 6, margin - 6, contentWidth + 12, pageHeight - (margin * 2) + 12, 3, 3);
  doc.setDrawColor(91, 107, 86);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin * 2) + 8, 2, 2);

  // Cover Badge
  doc.setFillColor(234, 240, 232);
  doc.roundedRect(margin, margin + 8, 48, 8, 2, 2, 'F');
  doc.setTextColor(63, 84, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(book.isKidsMode ? 'KIDS STORYBOOK' : `${book.genre.toUpperCase()} CHRONICLE`, margin + 4, margin + 13.5);

  if (book.moralLesson) {
    doc.setFillColor(250, 237, 232);
    doc.roundedRect(margin + 52, margin + 8, 56, 8, 2, 2, 'F');
    doc.setTextColor(180, 95, 60);
    doc.text(`VALUE: ${book.moralLesson.toUpperCase()}`, margin + 56, margin + 13.5);
  }

  // Cover Image if available
  let coverY = margin + 26;
  if (book.coverImage) {
    const coverData = await getBase64ImageFromUrl(book.coverImage);
    if (coverData) {
      try {
        const imgHeight = 72;
        doc.addImage(coverData, 'JPEG', margin, coverY, contentWidth, imgHeight, undefined, 'FAST');
        coverY += imgHeight + 12;
      } catch (e) {
        console.warn('Cover image render error in PDF:', e);
      }
    }
  }

  // Book Title
  doc.setTextColor(58, 52, 47);
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(book.title, contentWidth);
  doc.text(titleLines, margin, coverY + 4);
  coverY += titleLines.length * 9 + 6;

  // Synopsis
  doc.setTextColor(110, 102, 94);
  doc.setFont('times', 'italic');
  doc.setFontSize(12);
  const synopsisLines = doc.splitTextToSize(book.synopsis, contentWidth);
  doc.text(synopsisLines, margin, coverY);
  coverY += synopsisLines.length * 6 + 10;

  // Cast List
  if (book.cast && book.cast.length > 0) {
    doc.setTextColor(58, 52, 47);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Featured Characters:', margin, coverY);
    coverY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    book.cast.slice(0, 4).forEach((c) => {
      doc.setTextColor(91, 107, 86);
      doc.text(`• ${c.name}`, margin + 2, coverY);
      doc.setTextColor(120, 113, 106);
      doc.text(` (${c.titleOrRole || c.role}) - ${c.signatureItem || 'Key token'}`, margin + 30, coverY);
      coverY += 5;
    });
    coverY += 6;
  }

  // Cover Footer & Creator Credit
  doc.setTextColor(120, 113, 106);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated with MilousGem AI Studio • Total Chapters: ${book.chapters.length}`, margin, pageHeight - margin - 8);
  doc.setTextColor(91, 107, 86);
  doc.setFont('helvetica', 'bold');
  doc.text('Created and designed by Sam © 2026', margin, pageHeight - margin - 2);

  // --- CHAPTER PAGES ---
  for (let i = 0; i < book.chapters.length; i++) {
    const chapter = book.chapters[i];
    doc.addPage('a4', 'portrait');

    // Chapter Page background
    doc.setFillColor(254, 252, 248);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Subtle header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(160, 154, 146);
    doc.text(book.title.toUpperCase(), margin, 12);
    doc.text(`CHAPTER ${chapter.chapterNumber}`, pageWidth - margin - 24, 12);
    doc.setDrawColor(232, 226, 214);
    doc.line(margin, 14, pageWidth - margin, 14);

    let currY = 24;

    // Chapter Title
    doc.setTextColor(58, 52, 47);
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    const chapTitleLines = doc.splitTextToSize(`Chapter ${chapter.chapterNumber}: ${chapter.title}`, contentWidth);
    doc.text(chapTitleLines, margin, currY);
    currY += chapTitleLines.length * 7 + 4;

    // Chapter Image if present
    if (chapter.imageUrl) {
      const chapImgData = await getBase64ImageFromUrl(chapter.imageUrl);
      if (chapImgData) {
        try {
          const imgH = 68;
          doc.addImage(chapImgData, 'JPEG', margin, currY, contentWidth, imgH, undefined, 'FAST');
          currY += imgH + 8;
        } catch (e) {
          console.warn('Chapter image render error in PDF:', e);
        }
      }
    }

    // Chapter Story Text
    doc.setTextColor(58, 52, 47);
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    const paragraphs = chapter.content.split('\n\n');

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;
      const wrappedParagraph = doc.splitTextToSize(paragraph.trim(), contentWidth);
      
      // Page overflow check
      if (currY + (wrappedParagraph.length * 5.5) > pageHeight - margin - 15) {
        doc.addPage('a4', 'portrait');
        doc.setFillColor(254, 252, 248);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        currY = 20;
      }

      doc.text(wrappedParagraph, margin, currY, { lineHeightFactor: 1.35 });
      currY += wrappedParagraph.length * 5.8 + 4;
    }

    // Chosen choice / Path summary
    if (chapter.chosenChoiceId && chapter.choices) {
      const chosen = chapter.choices.find((c) => c.id === chapter.chosenChoiceId);
      if (chosen) {
        currY += 2;
        if (currY > pageHeight - margin - 20) {
          doc.addPage('a4', 'portrait');
          doc.setFillColor(254, 252, 248);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          currY = 20;
        }
        doc.setFillColor(245, 239, 235);
        doc.roundedRect(margin, currY, contentWidth, 12, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(180, 95, 60);
        doc.text('CHOSEN PATH:', margin + 4, currY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(58, 52, 47);
        doc.text(chosen.label, margin + 30, currY + 5);
        doc.setTextColor(120, 113, 106);
        doc.text(chosen.actionDescription, margin + 4, currY + 9.5);
      }
    }

    // Chapter Footer & Page Number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 144, 136);
    doc.text(`Page ${i + 2}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text('MilousGem Story Studio • Created and designed by Sam © 2026', margin, pageHeight - 8);
  }

  // Save the generated PDF
  const sanitizedTitle = book.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  doc.save(`${sanitizedTitle}_story.pdf`);
}

/**
 * Export full storybook as an open standard EPUB package (.epub)
 */
export async function exportStoryToEPUB(book: StoryBook): Promise<void> {
  const zip = new JSZip();

  // 1. mimetype (must be first, uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.folder('META-INF')?.file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  const oebps = zip.folder('OEBPS');
  if (!oebps) return;

  const bookId = `milousgem_${book.id || Date.now()}`;
  const dateStr = new Date(book.createdAt || Date.now()).toISOString().split('T')[0];

  // 3. CSS Stylesheet
  const cssContent = `
body {
  font-family: Georgia, "Times New Roman", serif;
  margin: 5%;
  line-height: 1.65;
  color: #2b2b2b;
  background-color: #fdfbf7;
}
h1, h2, h3 {
  font-family: Palatino, "Palatino Linotype", serif;
  color: #3e322b;
  text-align: center;
}
.cover-title {
  font-size: 2em;
  margin-top: 20%;
  margin-bottom: 0.2em;
}
.cover-tagline {
  font-style: italic;
  color: #6b625b;
  text-align: center;
  margin-bottom: 1.5em;
}
.cover-meta {
  text-align: center;
  font-size: 0.9em;
  color: #7b726b;
  border-top: 1px solid #e0d8ce;
  padding-top: 1em;
  margin-top: 2em;
}
.chapter-num {
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #70826c;
  text-align: center;
}
.chapter-title {
  font-size: 1.5em;
  margin-top: 0.2em;
  margin-bottom: 1em;
}
p {
  text-indent: 1.5em;
  margin-top: 0;
  margin-bottom: 0.8em;
}
.p-first {
  text-indent: 0;
}
.choice-box {
  background: #f4ede6;
  border-left: 3px solid #b45f3c;
  padding: 10px;
  margin: 20px 0;
  font-size: 0.9em;
}
.footer-credit {
  font-size: 0.8em;
  color: #888;
  text-align: center;
  margin-top: 3em;
}
`;
  oebps.file('styles.css', cssContent);

  // 4. Title Page (XHTML)
  const titleXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <title>${escapeXml(book.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="chapter-num">${book.isKidsMode ? 'Children’s Storybook' : escapeXml(book.genre.toUpperCase())}</div>
  <h1 class="cover-title">${escapeXml(book.title)}</h1>
  <p class="cover-tagline">${escapeXml(book.synopsis)}</p>
  <div class="cover-meta">
    <p><strong>Created and designed by Sam © 2026</strong></p>
    <p>Generated with MilousGem AI Studio</p>
    ${book.moralLesson ? `<p>Core Value: <em>${escapeXml(book.moralLesson)}</em></p>` : ''}
  </div>
</body>
</html>`;
  oebps.file('title.xhtml', titleXhtml);

  // 5. Chapter XHTMLs
  const manifestItems: string[] = [
    `<item id="styles" href="styles.css" media-type="text/css"/>`,
    `<item id="titlepage" href="title.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
  ];
  const spineItems: string[] = [`<itemref idref="titlepage"/>`];
  const navPoints: string[] = [
    `<navPoint id="navPoint-0" playOrder="1">
      <navLabel><text>Title Page</text></navLabel>
      <content src="title.xhtml"/>
    </navPoint>`,
  ];

  book.chapters.forEach((chap, idx) => {
    const chapFile = `chapter_${chap.chapterNumber}.xhtml`;
    const paragraphsHtml = chap.content
      .split('\n\n')
      .map((p, pIdx) => `<p class="${pIdx === 0 ? 'p-first' : ''}">${escapeXml(p)}</p>`)
      .join('\n');

    let choiceHtml = '';
    if (chap.chosenChoiceId && chap.choices) {
      const chosen = chap.choices.find((c) => c.id === chap.chosenChoiceId);
      if (chosen) {
        choiceHtml = `<div class="choice-box">
          <strong>Path Decided:</strong> ${escapeXml(chosen.label)}<br/>
          <em>${escapeXml(chosen.actionDescription)}</em>
        </div>`;
      }
    }

    const chapXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <title>Chapter ${chap.chapterNumber}: ${escapeXml(chap.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="chapter-num">Chapter ${chap.chapterNumber}</div>
  <h2 class="chapter-title">${escapeXml(chap.title)}</h2>
  ${paragraphsHtml}
  ${choiceHtml}
</body>
</html>`;

    oebps.file(chapFile, chapXhtml);
    manifestItems.push(`<item id="chap_${chap.chapterNumber}" href="${chapFile}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="chap_${chap.chapterNumber}"/>`);
    navPoints.push(
      `<navPoint id="navPoint-${idx + 1}" playOrder="${idx + 2}">
        <navLabel><text>Chapter ${chap.chapterNumber}: ${escapeXml(chap.title)}</text></navLabel>
        <content src="${chapFile}"/>
      </navPoint>`
    );
  });

  // 6. Table of Contents (toc.ncx)
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(book.title)}</text></docTitle>
  <docAuthor><text>Sam / MilousGem AI Studio</text></docAuthor>
  <navMap>
    ${navPoints.join('\n    ')}
  </navMap>
</ncx>`;
  oebps.file('toc.ncx', tocNcx);

  // 7. Package Metadata (content.opf)
  const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(book.title)}</dc:title>
    <dc:creator opf:role="aut">MilousGem &amp; Sam</dc:creator>
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:language>en</dc:language>
    <dc:rights>Created and designed by Sam © 2026</dc:rights>
    <dc:date>${dateStr}</dc:date>
    <dc:description>${escapeXml(book.synopsis)}</dc:description>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
  oebps.file('content.opf', contentOpf);

  // Generate and download
  const contentBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  const downloadUrl = URL.createObjectURL(contentBlob);
  const sanitizedTitle = book.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${sanitizedTitle}.epub`;
  a.click();
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Export full storybook as clean plain-text (.txt)
 */
export function exportStoryToText(book: StoryBook): void {
  let text = `========================================================\n`;
  text += `${book.title.toUpperCase()}\n`;
  text += `Created and designed by Sam © 2026 • MilousGem Studio\n`;
  text += `Genre: ${book.genre} | Style: ${book.artStyle} | Tone: ${book.tone}\n`;
  if (book.moralLesson) text += `Moral Value: ${book.moralLesson}\n`;
  text += `========================================================\n\n`;
  text += `SYNOPSIS:\n${book.synopsis}\n\n`;

  if (book.cast && book.cast.length > 0) {
    text += `FEATURED CHARACTERS:\n`;
    book.cast.forEach((c) => {
      text += `- ${c.name} (${c.titleOrRole}): ${c.signatureItem || 'Key token'}\n`;
      text += `  Backstory: ${c.backstory}\n`;
    });
    text += `\n`;
  }

  book.chapters.forEach((chap) => {
    text += `--------------------------------------------------------\n`;
    text += `CHAPTER ${chap.chapterNumber}: ${chap.title.toUpperCase()}\n`;
    text += `--------------------------------------------------------\n\n`;
    text += `${chap.content}\n\n`;

    if (chap.chosenChoiceId && chap.choices) {
      const chosen = chap.choices.find((c) => c.id === chap.chosenChoiceId);
      if (chosen) {
        text += `[Path Chosen]: ${chosen.label} — ${chosen.actionDescription}\n\n`;
      }
    }
  });

  text += `\n========================================================\n`;
  text += `End of Story • Created and designed by Sam © 2026\n`;
  text += `========================================================\n`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const sanitizedTitle = book.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizedTitle}_story.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Share Story using Web Share API with Clipboard Fallback
 */
export async function shareStory(
  book: StoryBook,
  format: 'pdf' | 'txt' | 'link' = 'txt'
): Promise<{ success: boolean; message: string }> {
  const shareText = `📖 "${book.title}"\n${book.synopsis}\n\nRead our interactive story crafted with MilousGem AI Studio (Created & designed by Sam © 2026)!`;

  if (format === 'pdf') {
    await exportStoryToPDF(book);
    return { success: true, message: 'PDF generated and downloaded for sharing!' };
  }

  if (format === 'txt') {
    exportStoryToText(book);
    return { success: true, message: 'Text transcript downloaded for sharing!' };
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: book.title,
        text: shareText,
        url: window.location.href,
      });
      return { success: true, message: 'Story shared successfully!' };
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText);
        return { success: true, message: 'Story summary copied to clipboard!' };
      }
      return { success: false, message: 'Share canceled.' };
    }
  } else {
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      return { success: true, message: 'Story summary copied to clipboard!' };
    } catch (err) {
      return { success: false, message: 'Could not copy to clipboard.' };
    }
  }
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
