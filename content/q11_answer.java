import java.util.ArrayList;
import java.util.Scanner;

class OutOfStockException extends Exception {
    public OutOfStockException(String message) {
        super(message);
    }
}

class Product {
    private String name;
    private int stock;

    public Product(String name, int stock) {
        this.name = name;
        this.stock = stock;
    }

    public String getName() { return name; }
    public int getStock() { return stock; }

    public void buy(int qty) throws OutOfStockException {
        if (qty <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }
        if (qty > stock) {
            throw new OutOfStockException("Not enough " + name + ": only " + stock + " left");
        }
        stock -= qty;
    }
}

public class Main {
    static Product find(ArrayList<Product> list, String name) {
        for (Product p : list) {
            if (p.getName().equalsIgnoreCase(name)) return p;
        }
        return null;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        ArrayList<Product> products = new ArrayList<>();

        int n = Integer.parseInt(sc.nextLine().trim());
        for (int i = 0; i < n; i++) {
            String[] p = sc.nextLine().split(";");
            products.add(new Product(p[0], Integer.parseInt(p[1])));
        }

        int m = Integer.parseInt(sc.nextLine().trim());
        for (int i = 0; i < m; i++) {
            String[] o = sc.nextLine().split(";");
            Product p = find(products, o[0]);
            if (p == null) {
                System.out.println("Product not found: " + o[0]);
                continue;
            }
            try {
                int qty = Integer.parseInt(o[1]);
                p.buy(qty);
                System.out.println("Bought " + qty + " " + p.getName() + ", " + p.getStock() + " left");
            } catch (NumberFormatException e) {
                System.out.println("Invalid quantity: " + o[1]);
            } catch (OutOfStockException | IllegalArgumentException e) {
                System.out.println("Failed: " + e.getMessage());
            }
        }

        System.out.println("Remaining stock:");
        for (Product p : products) {
            System.out.println(p.getName() + ": " + p.getStock());
        }
    }
}
