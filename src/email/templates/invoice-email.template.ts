export function invoiceEmailTemplate(order: any) {
    const items = order.items
      .map(
        (item) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>$${item.price}</td>
            <td>$${item.total}</td>
          </tr>
        `,
      )
      .join('');
  
    return `
      <h2>Order #${order.orderNumber}</h2>
      <p>Hello ${order.customerName || 'Customer'},</p>
      <p>Here are your order details.</p>
  
      <table border="1" cellpadding="8" cellspacing="0">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
  
      <h3>Total: $${order.total}</h3>
      <p>Thank you for shopping with Asiance.</p>
    `;
  }