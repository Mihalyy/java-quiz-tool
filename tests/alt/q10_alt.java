import java.util.*;

public class Main {
    Scanner scan = new Scanner(System.in);
    Vector<Product> data = new Vector<>();
    int idCounter = 0;

    class Product {
        String id, name, category;
        int price, stock;
        Product(String id, String name, String category, int price, int stock) {
            this.id = id; this.name = name; this.category = category; this.price = price; this.stock = stock;
        }
    }

    int inputNumber(String msg, int lo, int hi) {
        while (true) {
            System.out.print(msg);
            String s = scan.nextLine();
            try {
                int v = Integer.parseInt(s);
                if (v >= lo && v <= hi) return v;
            } catch (NumberFormatException e) { }
        }
    }

    void insert() {
        String name = "";
        while (name.length() < 5 || name.length() > 25) {
            System.out.print("Input product name [5-25 characters]: ");
            name = scan.nextLine();
        }
        String cat = "";
        List<String> valid = Arrays.asList("Food", "Beverage", "Household");
        while (!valid.contains(cat)) {
            System.out.print("Input product category [Food | Beverage | Household]: ");
            cat = scan.nextLine();
        }
        int price = inputNumber("Input product price [1000 - 1000000]: ", 1000, 1000000);
        int stock = inputNumber("Input product stock [1 - 500]: ", 1, 500);
        idCounter++;
        String id = "PR" + (idCounter < 10 ? "00" : idCounter < 100 ? "0" : "") + idCounter;
        data.add(new Product(id, name, cat, price, stock));
        System.out.println("Product " + id + " successfully inserted!");
    }

    boolean view() {
        if (data.size() == 0) {
            System.out.println("There is no product data!");
            return false;
        }
        Collections.sort(data, new Comparator<Product>() {
            @Override
            public int compare(Product a, Product b) {
                return a.name.compareTo(b.name);
            }
        });
        System.out.println("| No | ID | Name | Category | Price | Stock |");
        int no = 1;
        for (Product p : data) {
            System.out.println("| " + no++ + " | " + p.id + " | " + p.name + " | " + p.category + " | " + p.price + " | " + p.stock + " |");
        }
        return true;
    }

    void update() {
        if (!view()) return;
        int n = inputNumber("Input product number to update [1-" + data.size() + "]: ", 1, data.size());
        Product p = data.get(n - 1);
        p.price = inputNumber("Input new price [1000 - 1000000]: ", 1000, 1000000);
        p.stock = inputNumber("Input new stock [1 - 500]: ", 1, 500);
        System.out.println("Product " + p.id + " successfully updated!");
    }

    void delete() {
        if (!view()) return;
        int n = inputNumber("Input product number to delete [1-" + data.size() + "]: ", 1, data.size());
        String ans;
        do {
            System.out.print("Are you sure? [Y/N]: ");
            ans = scan.nextLine().toUpperCase();
        } while (!ans.equals("Y") && !ans.equals("N"));
        if (ans.equals("N")) { System.out.println("Delete cancelled"); return; }
        System.out.println("Product " + data.remove(n - 1).id + " successfully deleted!");
    }

    Main() {
        while (true) {
            System.out.println("Hehe Groceries\n1. Insert Product\n2. View Products\n3. Update Product\n4. Delete Product\n5. Exit");
            System.out.print(">> ");
            String c = scan.nextLine();
            if (c.equals("1")) insert();
            else if (c.equals("2")) view();
            else if (c.equals("3")) update();
            else if (c.equals("4")) delete();
            else if (c.equals("5")) { System.out.println("Thank you for using Hehe Groceries!"); break; }
        }
    }

    public static void main(String[] args) {
        new Main();
    }
}
