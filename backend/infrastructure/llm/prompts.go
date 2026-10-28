package llm

import _ "embed"

// Prompt templates are embedded so the binary does not depend on its working directory.

//go:embed expense_parser_prompt.txt
var ExpenseParserPrompt string

//go:embed bank_transaction_prompt.txt
var BankTransactionPrompt string
