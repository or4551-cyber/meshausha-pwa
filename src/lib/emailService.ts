import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined

function assertEmailConfigured(): void {
  if (
    !EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' ||
    !EMAILJS_TEMPLATE_ID || EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID' ||
    !EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY'
  ) {
    throw new Error('שליחת מייל לא מוגדרת - נא להגדיר VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID ו-VITE_EMAILJS_PUBLIC_KEY במשתני הסביבה')
  }
}

interface InvoiceRequestEmailParams {
  supplierName: string
  supplierEmail: string
  contactPerson: string
  branches: string[]
  month: string
  year: number
}

export const sendInvoiceRequest = async (params: InvoiceRequestEmailParams): Promise<boolean> => {
  try {
    assertEmailConfigured()
    const monthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ]
    
    const monthName = monthNames[parseInt(params.month.split('-')[1]) - 1]
    const branchesList = params.branches.map(b => `• ${b}`).join('\n')
    
    const templateParams = {
      to_email: params.supplierEmail,
      to_name: params.contactPerson || params.supplierName,
      supplier_name: params.supplierName,
      month_name: monthName,
      year: params.year,
      branches_list: branchesList,
      from_name: 'צוות משאוושה',
      reply_to: 'meshausha@example.com'
    }

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID!,
      EMAILJS_TEMPLATE_ID!,
      templateParams,
      EMAILJS_PUBLIC_KEY!
    )

    return response.status === 200
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

export const sendBulkInvoiceRequests = async (
  suppliers: Array<{
    name: string
    email: string
    contactPerson: string
    branches: string[]
  }>,
  month: string,
  year: number,
  onProgress?: (current: number, total: number, supplierName: string) => void
): Promise<{ success: number; failed: number; results: Array<{ supplier: string; success: boolean }> }> => {
  const results: Array<{ supplier: string; success: boolean }> = []
  let success = 0
  let failed = 0

  for (let i = 0; i < suppliers.length; i++) {
    const supplier = suppliers[i]
    
    if (onProgress) {
      onProgress(i + 1, suppliers.length, supplier.name)
    }

    const result = await sendInvoiceRequest({
      supplierName: supplier.name,
      supplierEmail: supplier.email,
      contactPerson: supplier.contactPerson,
      branches: supplier.branches,
      month,
      year
    })

    results.push({ supplier: supplier.name, success: result })
    
    if (result) {
      success++
    } else {
      failed++
    }

    // המתנה קצרה בין מיילים
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return { success, failed, results }
}
