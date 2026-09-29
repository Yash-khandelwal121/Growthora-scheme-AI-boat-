const { Table, TableRow, TableCell, Paragraph, TextRun, BorderStyle, WidthType, ShadingType } = require('docx');

function createSimpleTable(dataArray) {
  if (!dataArray || dataArray.length === 0) return new Paragraph("");

  const headers = Object.keys(dataArray[0]);

  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: String(h), bold: true })] })],
      shading: { fill: "D8E2DC", type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 100, bottom: 100, left: 100, right: 100 }
    }))
  });

  const dataRows = dataArray.map(item => new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ text: String(item[h] || "") })],
      margins: { top: 100, bottom: 100, left: 100, right: 100 }
    }))
  }));

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" },
    }
  });
}

function createKeyValueTable(obj) {
  if (!obj || Object.keys(obj).length === 0) return new Paragraph("");

  const rows = Object.entries(obj).map(([key, val]) => new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(key), bold: true })] })],
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: "F8F9FA", type: ShadingType.CLEAR, color: "auto" },
        margins: { top: 100, bottom: 100, left: 100, right: 100 }
      }),
      new TableCell({
        children: [new Paragraph({ text: String(val || "") })],
        width: { size: 70, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 100, right: 100 }
      })
    ]
  }));

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" },
    }
  });
}

module.exports = {
  createSimpleTable,
  createKeyValueTable
};
