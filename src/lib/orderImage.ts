import html2canvas from 'html2canvas'

interface BranchItems {
  branch: string
  items: { name: string; quantity: number }[]
  notes?: string
}

interface RenderOpts {
  supplier: string
  branches: BranchItems[]
  adminPhone?: string
  adminNote?: string
}

// Brand palette — aligned with app's burgundy+cream identity
const BURGUNDY = '#802020'
const PAPER = '#FBF5EA'
const INK = '#2A1410'
const MUTED = '#8A5A3A'
const BORDER_SOFT = 'rgba(128,32,32,0.25)'
const BORDER_DOUBLE = 'rgba(128,32,32,0.18)'

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=Heebo:wght@400;600;800&display=swap'

let fontsLoaded = false

async function ensureFontsLoaded(): Promise<void> {
  if (fontsLoaded) return
  if (!document.querySelector(`link[href="${FONTS_HREF}"]`)) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
  }
  try {
    await (document as Document & { fonts?: { ready: Promise<unknown>; load: (f: string) => Promise<unknown> } })
      .fonts?.load('900 40px "Frank Ruhl Libre"')
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
  } catch {
    // fonts may not be fully ready — proceed anyway
  }
  fontsLoaded = true
}

function buildHtml({ supplier, branches, adminPhone, adminNote }: RenderOpts): string {
  const dateStr = new Date().toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const adminNoteBlock = adminNote?.trim()
    ? `
      <div style="margin-top:22px;padding:16px 18px;background:#FFFFFF;border-right:4px solid ${BURGUNDY};box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <div style="font-family:'Heebo',sans-serif;font-weight:800;font-size:11px;letter-spacing:2px;color:${BURGUNDY};text-transform:uppercase;margin-bottom:4px;">הודעה חשובה</div>
        <div style="font-family:'Frank Ruhl Libre',serif;font-size:17px;font-weight:500;line-height:1.5;color:${INK};font-style:italic;white-space:pre-wrap;">${escapeHtml(adminNote.trim())}</div>
      </div>`
    : ''

  const sections = branches
    .filter(b => b.items.some(i => i.quantity > 0))
    .map(b => {
      const filtered = b.items.filter(i => i.quantity > 0)
      const rows = filtered
        .map(
          i => `
          <tr>
            <td style="font-family:'Frank Ruhl Libre',serif;font-size:18px;color:${INK};padding:9px 6px;border-bottom:1px dotted ${BORDER_SOFT};font-weight:500;">${escapeHtml(i.name)}</td>
            <td style="font-family:'Frank Ruhl Libre',serif;font-size:20px;color:${BURGUNDY};padding:9px 6px;border-bottom:1px dotted ${BORDER_SOFT};font-weight:900;text-align:center;width:80px;">${i.quantity}</td>
          </tr>`,
        )
        .join('')
      const notesLine = b.notes
        ? `<div style="font-family:'Heebo',sans-serif;font-size:12px;color:${MUTED};font-style:italic;padding:8px 10px;margin-top:6px;background:rgba(128,32,32,0.04);border-right:2px solid ${BORDER_SOFT};">📝 ${escapeHtml(b.notes)}</div>`
        : ''
      return `
        <div style="margin-top:24px;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;padding:8px 0;border-bottom:2px solid ${BURGUNDY};">
            <div style="font-family:'Frank Ruhl Libre',serif;font-size:22px;font-weight:900;color:${BURGUNDY};letter-spacing:-0.3px;">${escapeHtml(b.branch)}</div>
            <div style="font-family:'Heebo',sans-serif;font-size:11px;letter-spacing:2px;color:${MUTED};font-weight:700;text-transform:uppercase;">${filtered.length} פריטים</div>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="font-family:'Heebo',sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:800;color:${MUTED};padding:10px 6px 6px;text-align:right;border-bottom:1px solid rgba(128,32,32,0.15);">מוצר</th>
                <th style="font-family:'Heebo',sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:800;color:${MUTED};padding:10px 6px 6px;text-align:center;width:80px;border-bottom:1px solid rgba(128,32,32,0.15);">כמות</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${notesLine}
        </div>`
    })
    .join('')

  return `
    <div style="
      width:640px;
      padding:44px 44px 36px;
      background:${PAPER};
      direction:rtl;
      color:${INK};
      box-sizing:border-box;
      position:relative;
      font-family:'Heebo',sans-serif;
    ">
      <div style="position:absolute;top:14px;right:14px;bottom:14px;left:14px;border:1px solid ${BORDER_SOFT};pointer-events:none;"></div>
      <div style="position:absolute;top:19px;right:19px;bottom:19px;left:19px;border:3px double ${BORDER_DOUBLE};pointer-events:none;"></div>

      <div style="position:relative;display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:20px;border-bottom:1px solid ${BORDER_SOFT};">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:78px;height:78px;border-radius:50%;background:${BURGUNDY};color:${PAPER};display:flex;align-items:center;justify-content:center;font-family:'Frank Ruhl Libre',serif;font-weight:900;font-size:38px;line-height:1;box-shadow:0 6px 16px rgba(128,32,32,0.3),inset 0 0 0 3px rgba(251,245,234,0.25);letter-spacing:-1px;">מ</div>
          <div style="padding-right:4px;">
            <div style="font-family:'Frank Ruhl Libre',serif;font-weight:900;font-size:34px;color:${BURGUNDY};line-height:1;letter-spacing:-0.5px;">משאוושה</div>
            <div style="font-family:'Heebo',sans-serif;font-weight:600;font-size:11px;color:${MUTED};letter-spacing:4px;text-transform:uppercase;margin-top:6px;">רשת חומוסיות · צפון</div>
          </div>
        </div>
        <div style="text-align:left;">
          <div style="font-family:'Heebo',sans-serif;font-size:10px;letter-spacing:2.5px;color:${MUTED};font-weight:800;text-transform:uppercase;">תאריך</div>
          <div style="font-family:'Frank Ruhl Libre',serif;font-size:22px;font-weight:700;color:${INK};margin-top:2px;">${dateStr}</div>
        </div>
      </div>

      <div style="position:relative;text-align:center;margin:28px 0 8px;">
        <div style="font-family:'Heebo',sans-serif;font-size:11px;letter-spacing:6px;color:${MUTED};font-weight:800;text-transform:uppercase;">הזמנה רשמית לספק</div>
        <div style="font-family:'Frank Ruhl Libre',serif;font-size:40px;font-weight:900;color:${BURGUNDY};line-height:1;margin-top:6px;letter-spacing:-1px;">${escapeHtml(supplier)}</div>
        <div style="width:60px;height:2px;background:${BURGUNDY};margin:14px auto 0;"></div>
      </div>

      ${adminNoteBlock}

      <div style="position:relative;">${sections}</div>

      <div style="position:relative;margin-top:32px;padding-top:20px;border-top:1px solid ${BORDER_SOFT};display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-family:'Heebo',sans-serif;font-size:10px;letter-spacing:2.5px;color:${MUTED};font-weight:800;text-transform:uppercase;">לבירורים</div>
          <div style="font-family:'Frank Ruhl Libre',serif;font-size:22px;font-weight:700;color:${BURGUNDY};direction:ltr;display:inline-block;margin-top:2px;">${escapeHtml(adminPhone || '—')}</div>
        </div>
        <div style="width:68px;height:68px;border-radius:50%;border:2px solid ${BURGUNDY};display:flex;align-items:center;justify-content:center;font-family:'Frank Ruhl Libre',serif;font-weight:900;font-size:10px;color:${BURGUNDY};text-align:center;line-height:1.2;transform:rotate(-8deg);letter-spacing:1px;">משאוושה<br/>· אותנטי ·</div>
      </div>
    </div>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function generateOrderImage(opts: RenderOpts): Promise<Blob> {
  await ensureFontsLoaded()

  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.top = '-10000px'
  host.style.left = '-10000px'
  host.style.pointerEvents = 'none'
  host.innerHTML = buildHtml(opts)
  document.body.appendChild(host)

  const target = host.firstElementChild as HTMLElement

  try {
    const canvas = await html2canvas(target, {
      backgroundColor: PAPER,
      scale: 2,
      useCORS: true,
      logging: false,
    })
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/png',
        0.95,
      )
    })
  } finally {
    document.body.removeChild(host)
  }
}
