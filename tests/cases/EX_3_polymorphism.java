// Inheritance, abstract class, interface & polymorphism
import java.util.ArrayList;

interface Discountable {
    double discount();               // implicitly public abstract
}

abstract class Product {
    protected String name;
    protected double price;

    Product(String name, double price) {
        this.name = name;
        this.price = price;
    }

    abstract String category();      // every child must implement it

    double finalPrice() { return price; }

    @Override
    public String toString() {
        return String.format("%-10s %-14s Rp %,10.2f", category(), name, finalPrice());
    }
}

class Food extends Product implements Discountable {
    Food(String name, double price) { super(name, price); }
    String category() { return "Food"; }
    public double discount() { return 0.10; }
    @Override double finalPrice() { return price * (1 - discount()); }
}

class Electronic extends Product {
    private int warrantyMonths;
    Electronic(String name, double price, int warrantyMonths) {
        super(name, price);
        this.warrantyMonths = warrantyMonths;
    }
    String category() { return "Electronic"; }
    @Override public String toString() { return super.toString() + "  (" + warrantyMonths + " months warranty)"; }
}

public class Main {
    public static void main(String[] args) {
        ArrayList<Product> cart = new ArrayList<>();
        cart.add(new Food("Roti Tawar", 15000));
        cart.add(new Electronic("Rice Cooker", 350000, 12));
        cart.add(new Food("Keju", 27500));

        double total = 0;
        for (Product p : cart) {          // dynamic binding picks the right methods
            System.out.println(p);
            total += p.finalPrice();
            if (p instanceof Discountable d) {
                System.out.println("           -> discount " + (int) (d.discount() * 100) + "%");
            }
        }
        System.out.printf("Total: Rp %,.2f%n", total);
    }
}
