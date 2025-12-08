/**
 * ESC/POS Printer Commands
 * Based on standard ESC/POS command set
 * Compatible with most thermal receipt printers
 */

export const ESC_POS_COMMANDS = {
  // Control characters
  LF: '\x0a',
  ESC: '\x1b',
  FS: '\x1c',
  GS: '\x1d',
  US: '\x1f',
  FF: '\x0c',
  DLE: '\x10',
  DC1: '\x11',
  DC4: '\x14',
  EOT: '\x04',
  NUL: '\x00',
  EOL: '\n',

  // Feed control sequences
  FEED_CONTROL: {
    CTL_LF: '\x0a',     // Print and line feed
    CTL_FF: '\x0c',     // Form feed
    CTL_CR: '\x0d',     // Carriage return
    CTL_HT: '\x09',     // Horizontal tab
    CTL_VT: '\x0b',     // Vertical tab
  },

  // Line spacing
  LINE_SPACING: {
    LS_DEFAULT: '\x1b\x32',
    LS_SET: '\x1b\x33'
  },

  // Hardware commands
  HARDWARE: {
    HW_INIT: '\x1b\x40',          // Clear data in buffer and reset modes
    HW_SELECT: '\x1b\x3d\x01',    // Printer select
    HW_RESET: '\x1b\x3f\x0a\x00', // Reset printer hardware
  },

  // Cash drawer
  CASH_DRAWER: {
    CD_KICK_2: '\x1b\x70\x00',    // Sends pulse to pin 2
    CD_KICK_5: '\x1b\x70\x01',    // Sends pulse to pin 5
  },

  // Paper cutting
  PAPER: {
    PAPER_FULL_CUT: '\x1d\x56\x00',   // Full cut paper
    PAPER_PART_CUT: '\x1d\x56\x01',   // Partial cut paper
    PAPER_CUT_A: '\x1d\x56\x41',      // Partial cut paper (alternative)
    PAPER_CUT_B: '\x1d\x56\x42',      // Partial cut paper (alternative)
  },

  // Text formatting
  TEXT_FORMAT: {
    TXT_NORMAL: '\x1b\x21\x00',       // Normal text
    TXT_2HEIGHT: '\x1b\x21\x10',      // Double height text
    TXT_2WIDTH: '\x1b\x21\x20',       // Double width text
    TXT_4SQUARE: '\x1b\x21\x30',      // Double width & height text
    
    // Custom size function
    TXT_CUSTOM_SIZE: (width: number, height: number): string => {
      const widthDec = (width - 1) * 16;
      const heightDec = height - 1;
      const sizeDec = widthDec + heightDec;
      return '\x1d\x21' + String.fromCharCode(sizeDec);
    },

    // Height settings
    TXT_HEIGHT: {
      1: '\x00',
      2: '\x01',
      3: '\x02',
      4: '\x03',
      5: '\x04',
      6: '\x05',
      7: '\x06',
      8: '\x07'
    },

    // Width settings
    TXT_WIDTH: {
      1: '\x00',
      2: '\x10',
      3: '\x20',
      4: '\x30',
      5: '\x40',
      6: '\x50',
      7: '\x60',
      8: '\x70'
    },

    // Text decoration
    TXT_UNDERL_OFF: '\x1b\x2d\x00',   // Underline OFF
    TXT_UNDERL_ON: '\x1b\x2d\x01',    // Underline 1-dot ON
    TXT_UNDERL2_ON: '\x1b\x2d\x02',   // Underline 2-dot ON
    TXT_BOLD_OFF: '\x1b\x45\x00',     // Bold OFF
    TXT_BOLD_ON: '\x1b\x45\x01',      // Bold ON
    TXT_ITALIC_OFF: '\x1b\x35',       // Italic OFF
    TXT_ITALIC_ON: '\x1b\x34',        // Italic ON

    // Font selection
    TXT_FONT_A: '\x1b\x4d\x00',       // Font type A
    TXT_FONT_B: '\x1b\x4d\x01',       // Font type B
    TXT_FONT_C: '\x1b\x4d\x02',       // Font type C

    // Text alignment
    TXT_ALIGN_LT: '\x1b\x61\x00',     // Left justification
    TXT_ALIGN_CT: '\x1b\x61\x01',     // Center justification
    TXT_ALIGN_RT: '\x1b\x61\x02',     // Right justification
  },

  // Barcode
  BARCODE: {
    CODE39: '\x1d\x6b\x04',
    CODE128: '\x1d\x6b\x49',
    EAN13: '\x1d\x6b\x02',
    EAN8: '\x1d\x6b\x03',
    UPC_A: '\x1d\x6b\x00',
    UPC_E: '\x1d\x6b\x01',
  },

  // QR Code
  QR_CODE: {
    QR_MODEL: '\x1d\x28\x6b\x04\x00\x31\x41',
    QR_SIZE: '\x1d\x28\x6b\x03\x00\x31\x43',
    QR_ERROR_CORRECTION: '\x1d\x28\x6b\x03\x00\x31\x45',
    QR_STORE: '\x1d\x28\x6b',
    QR_PRINT: '\x1d\x28\x6b\x03\x00\x31\x51\x30',
  }
};

/**
 * Helper functions for printer commands
 */
export class PrinterCommands {
  /**
   * Generate horizontal line
   */
  static horizontalLine(width: number = 32, char: string = '='): string {
    return char.repeat(width) + ESC_POS_COMMANDS.EOL;
  }

  /**
   * Generate whitespace
   */
  static whitespace(count: number): string {
    return ' '.repeat(count);
  }

  /**
   * Center text within given width
   */
  static centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return this.whitespace(padding) + text;
  }

  /**
   * Right align text within given width
   */
  static rightAlignText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    return this.whitespace(padding) + text;
  }

  /**
   * Create two-column layout (label: value)
   */
  static twoColumn(label: string, value: string, width: number): string {
    const valueStr = value.toString();
    const padding = Math.max(1, width - label.length - valueStr.length);
    return label + this.whitespace(padding) + valueStr;
  }

  /**
   * Wrap text to fit width
   */
  static wrapText(text: string, width: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= width) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Format item line with quantity and price
   */
  static formatItemLine(
    name: string,
    quantity: number,
    price: number,
    total: number,
    width: number = 32
  ): string[] {
    const lines: string[] = [];
    const qtyStr = quantity.toString();
    const totalStr = total.toFixed(2);
    
    // Calculate available width for item name
    const qtyWidth = 4;
    const totalWidth = 8;
    const nameWidth = width - qtyWidth - totalWidth - 5; // 5 for spacing

    // Wrap item name if too long
    const nameLines = this.wrapText(name, nameWidth);
    
    // First line with qty, name, and total
    const firstLine = 
      qtyStr.padStart(qtyWidth) + ' x ' +
      nameLines[0].padEnd(nameWidth) + ' ' +
      totalStr.padStart(totalWidth);
    
    lines.push(firstLine);

    // Additional lines for wrapped name
    for (let i = 1; i < nameLines.length; i++) {
      const additionalLine = 
        this.whitespace(qtyWidth + 3) +
        nameLines[i].padEnd(nameWidth);
      lines.push(additionalLine);
    }

    return lines;
  }
}
