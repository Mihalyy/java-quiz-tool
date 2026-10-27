// Access modifiers (this does NOT compile - read the errors!)
class BankAccount {
    private double balance;          // only BankAccount can touch this
    protected String owner;          // package + subclasses
    String branch = "Jakarta";       // default: same package
    public String number;            // everyone

    public BankAccount(String owner, String number) {
        this.owner = owner;
        this.number = number;
    }

    public void deposit(double amount) {
        if (amount > 0) balance += amount;
    }

    public double getBalance() { return balance; }

    private void audit() { System.out.println("audit"); }
}

public class Main {
    public static void main(String[] args) {
        BankAccount acc = new BankAccount("Rina", "001-234");
        acc.deposit(500000);
        System.out.println(acc.getBalance());   // OK: public getter

        acc.balance = 1000000000;               // error: balance has private access
        acc.audit();                            // error: audit() has private access
        System.out.println(acc.owner + " " + acc.branch + " " + acc.number); // OK in the same package
    }
}
