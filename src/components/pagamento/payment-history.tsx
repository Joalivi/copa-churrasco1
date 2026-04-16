import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment, PaymentItem } from "@/types";

interface PaymentWithItems extends Payment {
  payment_items: PaymentItem[];
}

function methodLabel(method: string): string {
  if (method === "pix") return "PIX";
  if (method === "card" || method === "stripe") return "Cartão";
  return method.toUpperCase();
}

function methodBadgeClass(method: string): string {
  if (method === "pix") return "bg-emerald-100 text-emerald-700";
  return "bg-blue/10 text-blue";
}

function statusLabel(status: string): string {
  if (status === "succeeded") return "Pago";
  if (status === "pending") return "Pendente";
  if (status === "failed") return "Falhou";
  return status;
}

function statusBadgeClass(status: string): string {
  if (status === "succeeded") return "bg-green/10 text-green";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

interface PaymentHistoryProps {
  payments: PaymentWithItems[];
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="card text-center py-6">
        <p className="text-2xl mb-2">💳</p>
        <p className="text-sm text-zinc-500">
          Nenhum pagamento registrado ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="card hover:shadow-lg transition-shadow duration-200"
        >
          {/* Linha principal */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-foreground">
                  {formatCurrency(payment.amount)}
                </p>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${methodBadgeClass(
                    payment.payment_method
                  )}`}
                >
                  {methodLabel(payment.payment_method)}
                </span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadgeClass(
                    payment.status
                  )}`}
                >
                  {statusLabel(payment.status)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {formatDate(payment.created_at)}
              </p>
            </div>
          </div>

          {/* Itens do pagamento */}
          {payment.payment_items && payment.payment_items.length > 0 && (
            <div className="mt-2 pt-2 border-t border-zinc-100 flex flex-col gap-1">
              {payment.payment_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-zinc-500 truncate flex-1 pr-2">
                    {item.description}
                  </span>
                  <span className="text-foreground font-medium shrink-0">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
