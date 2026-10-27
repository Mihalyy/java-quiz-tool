// Exceptions & input validation with try-catch
import java.util.InputMismatchException;
import java.util.Scanner;

class OutOfStockException extends Exception {
    public OutOfStockException(String message) { super(message); }
}

public class Main {
    static int stock = 5;

    static void buy(int qty) throws OutOfStockException {
        if (qty > stock) throw new OutOfStockException("Only " + stock + " left, you asked for " + qty);
        stock -= qty;
        System.out.println("Bought " + qty + ", stock now " + stock);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int qty = -1;
        while (qty < 1) {
            System.out.print("Quantity to buy [>= 1]: ");
            try {
                qty = sc.nextInt();
            } catch (InputMismatchException e) {
                System.out.println("Please type a number!");
            }
            sc.nextLine();   // clear the rest of the line
        }
        try {
            buy(qty);
        } catch (OutOfStockException e) {
            System.out.println("Failed: " + e.getMessage());
        } finally {
            System.out.println("Thank you!");
        }

        int[] shelf = new int[3];
        System.out.println(shelf[3]);   // uncaught -> ArrayIndexOutOfBoundsException
    }
}
