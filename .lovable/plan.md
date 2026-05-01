

## Add Monthly Analysis Table Below Trend Chart

**What changes:**

**`src/pages/CustomerDetail.tsx`**
- Add a new Card section titled "Monthly Analysis" immediately after the Trend Charts card
- Display a table with columns: **Month**, **Sales (₹L)**, **Receipts (₹L)**, **Credit Notes (₹L)**, **Outstanding (₹L)**, **Overdue (₹L)**
- Data source: the existing `trendData` array (already has all these fields)
- Add a totals/summary row at the bottom with column sums
- Style consistently with the invoice table — same text sizes, font-mono for numbers, muted header row

This gives users the exact figures alongside the graph for easy reading and comparison.

