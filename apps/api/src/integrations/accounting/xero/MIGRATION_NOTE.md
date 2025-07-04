# Xero Integration Migration Note

## Current State (As of 2025-07-02)

The Xero integration has been updated to use the official xero-node library methods instead of direct axios calls.

### Key Changes:

1. **All use cases now use official xero-node API methods**:
   - `ImportAccountsUseCase` - Uses API wrapper for accounts (due to xero-node error handling issues)
   - `ImportSuppliersUseCase` - Uses API wrapper for contacts (due to xero-node error handling issues)
   - `ImportInvoicesUseCase` - Uses `accounting.getInvoices()` with safeXeroApiCall wrapper
   - `ImportBankStatementsUseCase` - Uses `accounting.getBankTransactions()` with safeXeroApiCall wrapper
   - `ImportManualJournalsUseCase` - Uses `accounting.getManualJournals()` with safeXeroApiCall wrapper
   - `ImportTransactionsSimpleUseCase` - Uses `accounting.getBankTransactions()` with safeXeroApiCall wrapper

2. **Error Handling**:
   - Created `xero-error-handler.ts` with `safeXeroApiCall` wrapper to handle xero-node's ApiError bug
   - The bug occurs when xero-node tries to access `axiosError.response.status` when response is undefined

3. **XeroApiWrapper**:
   - Still needed for `getAccounts()` and `getContacts()` due to persistent issues with xero-node error handling
   - Other methods in the wrapper are deprecated and should not be used

### Known Issues:

1. **xero-node ApiError bug**: The library throws when trying to access properties of undefined response in network error scenarios
2. **Accounts and Contacts**: These endpoints seem particularly prone to the error, so we use the wrapper

### Future Work:

1. Monitor xero-node library updates for fixes to the ApiError issue
2. Once fixed, migrate `getAccounts()` and `getContacts()` to use official methods
3. Remove the XeroApiWrapper completely once all methods can use the official API reliably