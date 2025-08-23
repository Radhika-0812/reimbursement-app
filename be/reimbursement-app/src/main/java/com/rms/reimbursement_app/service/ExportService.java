package com.rms.reimbursement_app.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.rms.reimbursement_app.dto.ClaimExportRow;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;     // POI Font
import org.apache.poi.ss.usermodel.Row;      // POI Row
import org.apache.poi.ss.usermodel.Sheet;    // POI Sheet
import org.apache.poi.xssf.usermodel.XSSFWorkbook;  // ✅ correct class name



import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.util.List;

@Service
public class ExportService {

    private static final String[] COLS = {
            "ID", "User", "Title", "Claim Type", "Status",
            "Amount (cents)", "Created At", "Updated At", "Admin Comment"
    };

    private static String s(String v) { return v == null ? "" : v; }

    /** Excel (.xlsx) */
    // in ExportService.java
    public void writeExcel(OutputStream os, List<ClaimExportRow> rows) throws IOException {
        // Use in-memory workbook
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Claims");



            Row h = sheet.createRow(0);
            CellStyle head = wb.createCellStyle();
            Font hf = wb.createFont();
            hf.setBold(true);
            head.setFont(hf);

            final String[] COLS = {
                    "ID","User","Title","Claim Type","Status",
                    "Amount (cents)","Created At","Updated At","Admin Comment"
            };

            // header
            for (int i = 0; i < COLS.length; i++) {
                Cell c = h.createCell(i);
                c.setCellValue(COLS[i]);
                c.setCellStyle(head);
            }

            // rows
            int r = 1;
            for (ClaimExportRow row : rows) {
                Row rr = sheet.createRow(r++);
                rr.createCell(0).setCellValue(row.id() == null ? 0 : row.id());
                rr.createCell(1).setCellValue(row.userName() == null ? "" : row.userName());
                rr.createCell(2).setCellValue(row.title() == null ? "" : row.title());
                rr.createCell(3).setCellValue(row.claimType() == null ? "" : row.claimType());
                rr.createCell(4).setCellValue(row.status() == null ? "" : row.status());
                rr.createCell(5).setCellValue(row.amountCents() == null ? 0 : row.amountCents());
                rr.createCell(6).setCellValue(row.createdAt() == null ? "" : row.createdAt());
                rr.createCell(7).setCellValue(row.updatedAt() == null ? "" : row.updatedAt());
                rr.createCell(8).setCellValue(row.adminComment() == null ? "" : row.adminComment());

            }

            // auto-size safely (fallback width if POI refuses for any reason)
            for (int i = 0; i < COLS.length; i++) {
                try {
                    sheet.autoSizeColumn(i, true);
                } catch (Throwable ignored) {
                    sheet.setColumnWidth(i, 20 * 256);
                }
            }

            wb.write(os); // do not close 'os'
        }
    }

    /** PDF */
    public void writePdf(OutputStream os, List<ClaimExportRow> rows) throws Exception {
        Document doc = new Document(PageSize.A4.rotate(), 24, 24, 24, 24);
        PdfWriter.getInstance(doc, os);
        doc.open();

        Paragraph title = new Paragraph("Claims Export",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14));
        title.setAlignment(Element.ALIGN_CENTER);
        doc.add(title);
        doc.add(new Paragraph(" "));

        PdfPTable table = new PdfPTable(COLS.length);
        table.setWidthPercentage(100);

        for (String col : COLS) {
            PdfPCell cell = new PdfPCell(new Phrase(
                    col, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
            table.addCell(cell);
        }

        for (ClaimExportRow row : rows) {
            table.addCell(String.valueOf(row.id() == null ? "" : row.id()));
            table.addCell(s(row.userName()));
            table.addCell(s(row.title()));
            table.addCell(s(row.claimType()));
            table.addCell(s(row.status()));
            table.addCell(String.valueOf(row.amountCents() == null ? 0 : row.amountCents()));
            table.addCell(s(row.createdAt()));
            table.addCell(s(row.updatedAt()));
            table.addCell(s(row.adminComment()));
        }

        doc.add(table);
        doc.close();
    }
}
