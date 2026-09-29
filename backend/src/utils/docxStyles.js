const { AlignmentType } = require('docx');

const styles = {
  default: {
    document: {
      run: {
        font: "Arial",
        size: 22, // 11pt (size is in half-points)
        color: "333333"
      },
      paragraph: {
        spacing: { line: 276, before: 120, after: 120 }
      }
    }
  },
  paragraphStyles: [
    {
      id: "Title",
      name: "Title",
      basedOn: "Normal",
      next: "Normal",
      run: {
        size: 48, // 24pt
        bold: true,
        color: "1B4332", // Forest Green-ish
        font: "Arial"
      },
      paragraph: {
        spacing: { before: 240, after: 240 }
      }
    },
    {
      id: "Heading1",
      name: "Heading 1",
      basedOn: "Normal",
      next: "Normal",
      run: {
        size: 44, // 22pt
        bold: true,
        color: "1B4332",
        font: "Arial"
      },
      paragraph: {
        spacing: { before: 240, after: 120 }
      }
    },
    {
      id: "Heading2",
      name: "Heading 2",
      basedOn: "Normal",
      next: "Normal",
      run: {
        size: 32, // 16pt
        bold: true,
        color: "2D6A4F",
        font: "Arial"
      },
      paragraph: {
        spacing: { before: 200, after: 100 }
      }
    },
    {
      id: "Heading3",
      name: "Heading 3",
      basedOn: "Normal",
      next: "Normal",
      run: {
        size: 26, // 13pt
        bold: true,
        color: "40916C",
        font: "Arial"
      },
      paragraph: {
        spacing: { before: 160, after: 80 }
      }
    },
    {
      id: "Snippet",
      name: "Snippet",
      basedOn: "Normal",
      next: "Normal",
      run: {
        size: 22,
        bold: true,
        color: "111111"
      },
      paragraph: {
        spacing: { before: 120, after: 120 },
        indent: { left: 360, right: 360 }
      }
    },
    {
      id: "Code",
      name: "Code",
      basedOn: "Normal",
      next: "Normal",
      run: {
        font: "Courier New",
        size: 18,
        color: "555555"
      }
    },
    {
      id: "Warning",
      name: "Warning",
      basedOn: "Normal",
      next: "Normal",
      run: {
        bold: true,
        color: "D32F2F"
      },
      paragraph: {
        alignment: AlignmentType.CENTER
      }
    }
  ]
};

module.exports = styles;
