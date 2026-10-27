import java.util.ArrayList;
import java.util.Comparator;
import java.util.Scanner;

class Product {
    private String name;
    private String category;
    private int price;

    public Product(String name, String category, int price) {
        this.name = name;
        this.category = category;
        this.price = price;
    }

    public String getName() { return name; }
    public String getCategory() { return category; }
    public int getPrice() { return price; }

    @Override
    public String toString() {
        return name + " (" + category + ") - Rp " + price;
    }
}

public class Main {
    static void printAll(ArrayList<Product> list) {
        for (Product p : list) {
            System.out.println(p);
        }
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        ArrayList<Product> products = new ArrayList<>();

        int n = Integer.parseInt(sc.nextLine().trim());
        for (int i = 0; i < n; i++) {
            String[] p = sc.nextLine().split(";");
            products.add(new Product(p[0], p[1], Integer.parseInt(p[2])));
        }

        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim();
            if (line.equals("END")) break;
            String[] cmd = line.split(" ", 2);

            if (line.equals("SORT PRICE")) {
                products.sort(Comparator.comparingInt(Product::getPrice).thenComparing(Product::getName));
                printAll(products);
            } else if (line.equals("SORT NAME")) {
                products.sort((a, b) -> a.getName().compareToIgnoreCase(b.getName()));
                printAll(products);
            } else if (cmd[0].equals("SEARCH")) {
                String key = cmd[1].toLowerCase();
                boolean found = false;
                for (Product p : products) {
                    if (p.getName().toLowerCase().contains(key)) {
                        System.out.println(p);
                        found = true;
                    }
                }
                if (!found) System.out.println("No product matches '" + cmd[1] + "'");
            } else if (cmd[0].equals("CHEAPEST")) {
                Product best = null;
                for (Product p : products) {
                    if (p.getCategory().equals(cmd[1]) && (best == null || p.getPrice() < best.getPrice())) {
                        best = p;
                    }
                }
                if (best == null) System.out.println("No product in " + cmd[1]);
                else System.out.println("Cheapest " + cmd[1] + ": " + best);
            }
        }
    }
}
