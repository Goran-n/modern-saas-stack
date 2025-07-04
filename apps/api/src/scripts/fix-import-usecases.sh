#!/bin/bash

# Fix ImportManualJournalsUseCase
sed -i '' 's/importType: .manual_journals./batchType: '\''manual_journals'\'',\n          importSource: '\''xero'\'',/g' src/core/usecases/sync/import-manual-journals.usecase.ts
sed -i '' 's/if (!input.options?.dryRun) {//' src/core/usecases/sync/import-manual-journals.usecase.ts
sed -i '' 's/createdRecords:/failedRecords:/g' src/core/usecases/sync/import-manual-journals.usecase.ts
sed -i '' 's/updatedRecords:/failedRecords:/g' src/core/usecases/sync/import-manual-journals.usecase.ts
sed -i '' 's/errorRecords:/failedRecords:/g' src/core/usecases/sync/import-manual-journals.usecase.ts

# Fix ImportBankStatementsUseCase
sed -i '' 's/importType: .bank_statements./batchType: '\''bank_statements'\'',\n          importSource: '\''xero'\'',/g' src/core/usecases/sync/import-bank-statements.usecase.ts
sed -i '' 's/if (!input.options?.dryRun) {//' src/core/usecases/sync/import-bank-statements.usecase.ts
sed -i '' 's/createdRecords:/failedRecords:/g' src/core/usecases/sync/import-bank-statements.usecase.ts
sed -i '' 's/updatedRecords:/failedRecords:/g' src/core/usecases/sync/import-bank-statements.usecase.ts
sed -i '' 's/errorRecords:/failedRecords:/g' src/core/usecases/sync/import-bank-statements.usecase.ts

echo "Fixed import use cases"