"""Self-contained 3-layout DXF -> multi-page PDF smoke test."""
from pathlib import Path
import ezdxf
import fitz
from server import open_dxf, stats, pdf_page

HERE=Path(__file__).resolve().parent

def main():
    dst=HERE/'demo_three_layouts.dxf'
    doc=ezdxf.new('R2018')
    doc.modelspace().add_lwpolyline([(0,0),(100,50),(200,0)],dxfattribs={'color':5})
    for i,title in enumerate(['SITE PLAN','TOWER ELEVATION','FOUNDATION DETAIL'],start=1):
        sheet=doc.layouts.new(title)
        sheet.page_setup(size=(420,297),units='mm',margins=(10,10,10,10))
        sheet.add_line((10,10),(400,10),dxfattribs={'color':1})
        sheet.add_line((400,10),(400,280))
        sheet.add_line((400,280),(10,280))
        sheet.add_line((10,280),(10,10))
        sheet.add_text(title,dxfattribs={'height':15,'insert':(25,250)})
        sheet.add_text('DEMO SHEET %s'%i,dxfattribs={'height':10,'insert':(25,200)})
        sheet.add_circle((210,125),radius=38+i*10)
    doc.saveas(dst)
    read=open_dxf(dst)
    sheets,warnings=stats(read)
    print('PDF testing layout names:',[x['name'] for x in sheets])
    combined=fitz.open()
    for item in [s for s in sheets if s["printable"]>0]:
        data=pdf_page(read, read.layouts.get(item['name']), 'source', 'auto', 'mono')
        pdf=fitz.open(stream=data,filetype='pdf')
        combined.insert_pdf(pdf)
        pdf.close()
    pdf_out=HERE/'demo_three_layouts.pdf'
    combined.save(pdf_out)
    combined.close()
    audit=fitz.open(pdf_out)
    print('PDF produced:',pdf_out.name,'total pages:',audit.page_count)
    print('Page sizes:',[(round(p.rect.width),round(p.rect.height)) for p in audit])
    assert audit.page_count==3,'Pages are missing'
    assert len(audit[0].get_drawings()) >= 2, 'Vector content missing in first page'
    audit.close()
    print('OK: DXF 3 paper layouts → PDF 3 pages')

if __name__=='__main__':
    main()
