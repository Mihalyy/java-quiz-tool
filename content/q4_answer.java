import java.util.ArrayList;
import java.util.Scanner;

abstract class Item {
    private String name;
    private double price;

    public Item(String name, double price) {
        this.name = name;
        this.price = price;
    }

    public String getName() { return name; }
    public double getPrice() { return price; }

    public abstract double getDiscountRate();

    public double getFinalPrice() {
        return price - price * getDiscountRate();
    }
}

class Food extends Item {
    public Food(String name, double price) { super(name, price); }

    @Override
    public double getDiscountRate() { return 0.10; }
}

class Beverage extends Item {
    public Beverage(String name, double price) { super(name, price); }

    @Override
    public double getDiscountRate() { return 0.05; }
}

class Household extends Item {
    public Household(String name, double price) { super(name, price); }

    @Override
    public double getDiscountRate() {
        return getPrice() >= 50000 ? 0.15 : 0;
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        ArrayList<Item> cart = new ArrayList<>();

        int n = Integer.parseInt(sc.nextLine().trim());
        for (int i = 0; i < n; i++) {
            String[] p = sc.nextLine().split(";");
            double price = Double.parseDouble(p[2]);
            switch (p[0]) {
                case "F": cart.add(new Food(p[1], price)); break;
                case "B": cart.add(new Beverage(p[1], price)); break;
                default: cart.add(new Household(p[1], price)); break;
            }
        }

        double total = 0;
        for (Item it : cart) {
            System.out.printf("[%s] %s: Rp %.2f -> Rp %.2f%n",
                    it.getClass().getSimpleName(), it.getName(), it.getPrice(), it.getFinalPrice());
            total += it.getFinalPrice();
        }
        System.out.printf("Total to pay: Rp %.2f%n", total);
    }
}
