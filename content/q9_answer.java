import java.util.ArrayList;
import java.util.Scanner;

class Product {
    private String id;
    private String name;
    private String category;
    private int price;
    private int stock;

    public Product(String id, String name, String category, int price, int stock) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.price = price;
        this.stock = stock;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public int getPrice() { return price; }
    public int getStock() { return stock; }
}

public class Main {
    static Scanner sc = new Scanner(System.in);
    static ArrayList<Product> products = new ArrayList<>();
    static int counter = 1;

    static int readInt(String prompt, int min, int max) {
        int value;
        while (true) {
            System.out.print(prompt);
            try {
                value = sc.nextInt();
            } catch (Exception e) {
                value = min - 1;
            }
            sc.nextLine();
            if (value >= min && value <= max) {
                return value;
            }
        }
    }

    static void insertProduct() {
        String name;
        do {
            System.out.print("Input product name [5-25 characters]: ");
            name = sc.nextLine();
        } while (name.length() < 5 || name.length() > 25);

        String category;
        do {
            System.out.print("Input product category [Food | Beverage | Household]: ");
            category = sc.nextLine();
        } while (!category.equals("Food") && !category.equals("Beverage") && !category.equals("Household"));

        int price = readInt("Input product price [1000 - 1000000]: ", 1000, 1000000);
        int stock = readInt("Input product stock [1 - 500]: ", 1, 500);

        String id = String.format("PR%03d", counter++);
        products.add(new Product(id, name, category, price, stock));
        System.out.println("Product " + id + " successfully inserted!");
    }

    static void viewProducts() {
        if (products.isEmpty()) {
            System.out.println("There is no product data!");
            return;
        }
        products.sort((a, b) -> a.getName().compareTo(b.getName()));
        String line = "+----+-------+---------------------------+------------+---------+-------+";
        System.out.println(line);
        System.out.printf("| %-2s | %-5s | %-25s | %-10s | %-7s | %-5s |%n", "No", "ID", "Name", "Category", "Price", "Stock");
        System.out.println(line);
        for (int i = 0; i < products.size(); i++) {
            Product p = products.get(i);
            System.out.printf("| %-2d | %-5s | %-25s | %-10s | %-7d | %-5d |%n",
                    i + 1, p.getId(), p.getName(), p.getCategory(), p.getPrice(), p.getStock());
        }
        System.out.println(line);
    }

    public static void main(String[] args) {
        int choice;
        do {
            System.out.println("Hehe Groceries");
            System.out.println("==============");
            System.out.println("1. Insert Product");
            System.out.println("2. View Products");
            System.out.println("3. Exit");
            System.out.print(">> ");
            try {
                choice = sc.nextInt();
            } catch (Exception e) {
                choice = 0;
            }
            sc.nextLine();

            switch (choice) {
                case 1:
                    insertProduct();
                    break;
                case 2:
                    viewProducts();
                    break;
                case 3:
                    System.out.println("Thank you for using Hehe Groceries!");
                    break;
            }
        } while (choice != 3);
    }
}
