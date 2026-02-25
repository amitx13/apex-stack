export interface VendorBankDetails {
    accountNumber: string,
    reEnterAccountNumber: string,
    ifscCode: string,
    bankName: string,
    accountType: 'SAVINGS' | 'CURRENT',
    upiId?: string,
    phonepeNumber?: string,
    qrCodeUrl: string | null
}