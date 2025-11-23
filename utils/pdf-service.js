import PDFDocument from 'pdfkit';
import userDetails from '../models/user.js';
import Userdocument from '../models/document.js';


async function PDFBuild(dataCallback, endCallback) {
    const users = await userDetails.find();

    const doc = new PDFDocument();
    doc.on("data", dataCallback);
    doc.on("end", endCallback);

    doc.fontSize(20).text("User Details Report\n\n");

    users.forEach((user, index) => {
        doc.fontSize(14).text(`User ${index + 1}`, { align: 'center' });
        doc.fontSize(12).text(`Name: ${user}`);
        doc.text(`\n`);
        doc.text(`\n`);
    });

    doc.end();
}


export default PDFBuild