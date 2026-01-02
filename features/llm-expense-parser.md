# LLM-Powered Expense Parser Feature

## Feature Description

This feature enables users to quickly add expenses by providing natural language input instead of manually filling out all form fields. Users can describe an expense in plain English (e.g., "20 euros, spent for groceries shopping in Kaufland today, paid with credit card"), and an LLM will parse the input to extract and pre-fill the "Add new Expense" form.

### Key Benefits
- **Faster data entry**: Eliminates need to fill multiple form fields individually
- **Flexibility**: Natural language input allows various ways to describe the same transaction
- **Error reduction**: LLM parsing reduces manual entry mistakes
- **Intuitive UX**: Users describe expenses naturally, just like telling a friend about a purchase

### User Flow
1. User clicks "Add Expense via AI" or similar button
2. Modal/input field appears with textarea for natural language input
3. User types expense description (e.g., "20 euros for groceries at Kaufland today with credit card")
4. User clicks "Parse with AI" button
5. Frontend calls backend API to parse the string
6. LLM extracts: amount, category, vendor, date, payment method, description
7. Form is pre-filled with extracted data
8. User can review and edit any fields as needed
9. User clicks "Add Expense" to save

## Implementation Plan

### Phase 1: Backend Integration
1. **Setup Claude API Integration**
   - Add Anthropic SDK to Go backend
   - Create environment variable for API key (`ANTHROPIC_API_KEY`)
   - Create config entry in `backend/configs/local.yaml`

2. **Create Domain Entity for Parsing**
   - Create `ParsedExpenseInput` value object in `domain/valueobjects/`
   - Represents extracted expense data: amount, category, vendor, date, paymentMethod, description

3. **Create UseCase Layer**
   - Create `ParseExpenseUseCase` in `usecases/interactors/`
   - Implements the LLM parsing logic
   - Returns `ParsedExpenseInput` value object
   - Handles LLM errors gracefully

4. **Create HTTP Handler**
   - Create `POST /api/v1/expenses/parse` endpoint in `infrastructure/http/handlers/`
   - Request DTO: `{ "text": "user input string" }`
   - Response DTO: extracted expense fields
   - Add comprehensive error handling

5. **Create Infrastructure Service**
   - Create `LLMService` in `infrastructure/` directory
   - Wraps Anthropic API calls
   - Uses Claude 3.5 Haiku (smallest available model)
   - Includes prompt engineering for expense extraction

### Phase 2: Frontend Implementation
1. **Create LLM Input Component**
   - New component: `AIExpenseParser.tsx` in `components/`
   - Modal with textarea for natural language input
   - Loading state while parsing
   - Error handling and user feedback

2. **API Integration**
   - Add `parseExpenseWithAI()` method to `api/client.ts`
   - Handles API calls to `/api/v1/expenses/parse`
   - Error handling and retry logic

3. **Integrate with Add Expense Form**
   - Modify `AddExpense.tsx` to use parsed data
   - When AI parsing completes, pre-fill form fields
   - User can review and edit before saving
   - Maintain all existing validation logic

### Phase 3: Testing & Verification
1. Manual testing with various input formats
2. Verify category and vendor mapping works correctly
3. Test error handling (invalid API key, API failures)
4. Verify form pre-filling and field validation
5. Test edge cases (ambiguous vendor, missing fields, invalid amounts)

## Technical Specifications

### Backend Architecture

**New Files to Create:**
```
backend/
├── infrastructure/
│   ├── llm/
│   │   └── client.go              # LLM service wrapper
│   └── http/handlers/
│       └── expense_parser_handler.go
├── usecases/interactors/
│   └── parse_expense_interactor.go
└── domain/valueobjects/
    └── parsed_expense_input.go
```

**Configuration (backend/configs/local.yaml):**
```yaml
llm:
  provider: anthropic
  model: claude-3-5-haiku-20241022
  api_key: ${ANTHROPIC_API_KEY}
  timeout: 10s
```

### LLM Prompt Design

The system will use a structured prompt to extract:
- **Amount** (numeric value and currency)
- **Category** (map to existing categories: Food, Transport, Entertainment, etc.)
- **Vendor** (merchant/store name)
- **Date** (parse natural language dates)
- **Payment Method** (credit card, cash, debit card, etc.)
- **Description** (original note/description)

### API Contract

**Endpoint:** `POST /api/v1/expenses/parse`

**Request:**
```json
{
  "text": "20 euros spent for groceries shopping in Kaufland today with credit card"
}
```

**Response:**
```json
{
  "amount": 20.00,
  "currency": "EUR",
  "category": "groceries",
  "vendor": "Kaufland",
  "vendor_id": 123,
  "date": "2025-01-02",
  "payment_method": "credit_card",
  "description": "groceries shopping",
  "confidence": 0.95
}
```

**Error Response:**
```json
{
  "error": "Failed to parse expense",
  "message": "Could not extract required fields from input"
}
```

### Frontend Component Structure

**AIExpenseParser.tsx:**
- Textarea input for natural language
- Loading spinner during parsing
- Error message display
- Button to trigger parsing
- Cancel button

**Integration Points:**
- AddExpense.tsx receives parsed data via callback
- Form fields auto-fill from parsed response
- User retains ability to edit any field

## Verification Criteria

### Functional Requirements
- [ ] Backend accepts POST request to `/api/v1/expenses/parse`
- [ ] LLM successfully parses natural language expense descriptions
- [ ] Extracted data matches user input (amount, date, category, vendor)
- [ ] Frontend component displays AI parser modal/input
- [ ] Parsed data correctly pre-fills Add Expense form
- [ ] User can edit any auto-filled fields
- [ ] Expense is saved correctly after user review

### Non-Functional Requirements
- [ ] LLM parsing completes within 5 seconds
- [ ] API handles errors gracefully (invalid input, LLM failures)
- [ ] Sensitive data (API keys) not exposed in logs or frontend
- [ ] API rate limiting handled appropriately
- [ ] No breaking changes to existing Add Expense functionality

### Test Cases
1. **Basic parsing**: "20 euros groceries Kaufland today credit card"
   - ✓ Extracts all fields correctly

2. **Partial data**: "50 euros food"
   - ✓ Extracts available fields, date defaults to today

3. **Natural language date**: "last Tuesday spent 30 euros at cafe"
   - ✓ Correctly parses relative date

4. **Currency conversion**: "15 USD spent at store"
   - ✓ Preserves currency information

5. **Error handling**: Invalid API key or LLM failure
   - ✓ Shows user-friendly error message

6. **Ambiguous vendor**: "20 euros at shop"
   - ✓ Handles gracefully (empty vendor_id or fuzzy match)

7. **Category mapping**: Various vendor names to correct categories
   - ✓ Maps common vendors to correct categories

## Model Selection

**Chosen Model:** Claude 3.5 Haiku
- **Reason**: Smallest available Claude model optimized for speed and cost
- **API Provider**: Anthropic
- **Model ID**: `claude-3-5-haiku-20241022`
- **Cost**: Most economical option
- **Speed**: Fastest response time for this use case
- **Capability**: Sufficient for structured expense data extraction

## Dependencies

**Backend:**
- `github.com/anthropics/anthropic-sdk-go` - Anthropic Go SDK

**Frontend:**
- Existing React and TypeScript stack
- No additional dependencies needed

## Environment Setup

1. Get Anthropic API key from https://console.anthropic.com
2. Set environment variable: `export ANTHROPIC_API_KEY=sk-ant-...`
3. Add to `backend/configs/local.yaml`:
   ```yaml
   llm:
     model: claude-3-5-haiku-20241022
     api_key: ${ANTHROPIC_API_KEY}
   ```

## Future Enhancements

- Multi-currency support
- Receipt image parsing (if image capability added to LLM)
- Recurring expense detection
- Smart category suggestions based on vendor history
- Batch expense import from formatted text
- Voice input support (speech-to-text → LLM parsing)
