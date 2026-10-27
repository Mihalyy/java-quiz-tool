import java.util.ArrayList;
import java.util.Scanner;

class Product {
    private String id;
    private String name;
    private int price;
    private int stock;

    public Product(String id, String name, int price, int stock) {
        this.id = id; this.name = name; this.price = price; this.stock = stock;
    }
    public String getId() { return id; }
    public String getName() { return name; }
    public int getPrice() { return price; }
    public int getStock() { return stock; }
    public void setPrice(int price) { this.price = price; }
    public void setStock(int stock) { this.stock = stock; }
}

public class Main {
    static Scanner sc = new Scanner(System.in);
    static ArrayList<Product> products = new ArrayList<>();

    static void insert() {
        String name;
        do {
            System.out.print("Input name [5-20 chars]: ");
            name = sc.nextLine();
        } while (name.length() < 5 || name.length() > 20);
        int price = 0;
        do {
            System.out.print("Input price [>= 1000]: ");
            try { price = sc.nextInt(); } catch (Exception e) { price = 0; }
            sc.nextLine();
        } while (price < 1000);
        int stock;
        do {
            System.out.print("Input stock [1-100]: ");
            stock = sc.nextInt(); sc.nextLine();
        } while (stock < 1 || stock > 100);
        String id = String.format("PR%03d", products.size() + 1);
        products.add(new Product(id, name, price, stock));
        System.out.println("Product " + id + " inserted!");
    }

    static boolean view() {
        if (products.isEmpty()) { System.out.println("No products available!"); return false; }
        products.sort((a, b) -> a.getName().compareTo(b.getName()));
        System.out.println("+-----+-------+----------------------+----------+-------+");
        System.out.printf("| %-3s | %-5s | %-20s | %-8s | %-5s |%n", "No", "ID", "Name", "Price", "Stock");
        System.out.println("+-----+-------+----------------------+----------+-------+");
        for (int i = 0; i < products.size(); i++) {
            Product p = products.get(i);
            System.out.printf("| %-3d | %-5s | %-20s | %8d | %5d |%n", i + 1, p.getId(), p.getName(), p.getPrice(), p.getStock());
        }
        System.out.println("+-----+-------+----------------------+----------+-------+");
        return true;
    }

    static void update() {
        if (!view()) return;
        int idx;
        do {
            System.out.print("Choose product number [1-" + products.size() + "]: ");
            idx = sc.nextInt(); sc.nextLine();
        } while (idx < 1 || idx > products.size());
        int price;
        do {
            System.out.print("Input new price: ");
            price = sc.nextInt(); sc.nextLine();
        } while (price < 1000);
        products.get(idx - 1).setPrice(price);
        System.out.println("Updated!");
    }

    static void delete() {
        if (!view()) return;
        System.out.print("Choose product number to delete: ");
        int idx = sc.nextInt(); sc.nextLine();
        if (idx < 1 || idx > products.size()) { System.out.println("Invalid!"); return; }
        Product removed = products.remove(idx - 1);
        System.out.println(removed.getName() + " deleted!");
    }

    public static void main(String[] args) {
        int choice;
        do {
            System.out.println("Hehe Groceries");
            System.out.println("1. Insert\n2. View\n3. Update\n4. Delete\n5. Exit");
            System.out.print(">> ");
            try {
                choice = sc.nextInt();
            } catch (Exception e) {
                choice = -1;
            }
            sc.nextLine();
            switch (choice) {
                case 1 -> insert();
                case 2 -> view();
                case 3 -> update();
                case 4 -> delete();
                case 5 -> System.out.println("Bye!");
                default -> System.out.println("Invalid choice");
            }
        } while (choice != 5);
    }
}
