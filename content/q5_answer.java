import java.util.Scanner;

interface Payment {
    double ADMIN_FEE = 2500;   // interface fields are public static final

    double pay(double amount);
    String getMethodName();
}

class Cash implements Payment {
    public double pay(double amount) { return amount; }
    public String getMethodName() { return "Cash"; }
}

class DebitCard implements Payment {
    public double pay(double amount) { return amount + ADMIN_FEE; }
    public String getMethodName() { return "Debit Card"; }
}

class EWallet implements Payment {
    public double pay(double amount) {
        if (amount >= 100000) {
            return amount - amount * 0.02;
        }
        return amount;
    }
    public String getMethodName() { return "E-Wallet"; }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int count = 0;
        double totalPaid = 0;

        while (true) {
            String code = sc.next();
            if (code.equals("END")) {
                break;
            }
            double amount = sc.nextDouble();

            Payment payment;
            if (code.equals("CASH")) {
                payment = new Cash();
            } else if (code.equals("DEBIT")) {
                payment = new DebitCard();
            } else if (code.equals("EWALLET")) {
                payment = new EWallet();
            } else {
                System.out.println("Unknown payment method: " + code);
                continue;
            }

            double paid = payment.pay(amount);
            System.out.printf("%s: bill Rp %.2f, paid Rp %.2f%n", payment.getMethodName(), amount, paid);
            count++;
            totalPaid += paid;
        }
        System.out.printf("Transactions: %d, total paid: Rp %.2f%n", count, totalPaid);
    }
}
