import java.util.ArrayList;
import java.util.Random;
import java.util.Scanner;
import java.util.Vector;

class Shoe {
    private String id, name, category;
    private int price;
    private String releaseDate;

    public Shoe(String id, String name, String category, int price, String releaseDate) {
        super();
        this.id = id;
        this.name = name;
        this.category = category;
        this.price = price;
        this.releaseDate = releaseDate;
    }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public int getPrice() { return price; }
    public String getReleaseDate() { return releaseDate; }
}

public class Main {
    Scanner scan = new Scanner(System.in);
    Random rand = new Random();
    Vector<Shoe> shoes = new Vector<>();
    ArrayList<String> logs = new ArrayList<String>();

    void cls() {
        for (int i = 0; i < 3; i++) System.out.println();
    }

    void enter() {
        System.out.print("Press enter to continue...");
        scan.nextLine();
    }

    boolean validDate(String d) {
        if (d.length() != 10) return false;
        if (d.charAt(2) != '-' || d.charAt(5) != '-') return false;
        for (int i = 0; i < d.length(); i++) {
            if (i == 2 || i == 5) continue;
            if (!Character.isDigit(d.charAt(i))) return false;
        }
        int day = Integer.parseInt(d.substring(0, 2));
        int month = Integer.parseInt(d.substring(3, 5));
        return day >= 1 && day <= 31 && month >= 1 && month <= 12;
    }

    void addShoe() {
        String name, category, date;
        int price = 0;
        do {
            System.out.print("Input shoe's name [must ends with shoe]: ");
            name = scan.nextLine();
        } while (!name.endsWith("shoe"));
        do {
            System.out.print("Input shoe's category [Sneaker | Running | Boot]: ");
            category = scan.nextLine();
        } while (!(category.equals("Sneaker") || category.equals("Running") || category.equals("Boot")));
        do {
            System.out.print("Input shoe's release date [dd-mm-yyyy]: ");
            date = scan.nextLine();
        } while (!validDate(date));
        do {
            System.out.print("Input shoe's price [more than or equals to 100]: ");
            try {
                price = scan.nextInt();
            } catch (Exception e) {
                System.out.println("Price must be numeric!");
            }
            scan.nextLine();
        } while (price < 100);
        String id = "SH" + rand.nextInt(10) + rand.nextInt(10) + rand.nextInt(10);
        shoes.add(new Shoe(id, name, category, price, date));
        logs.add("added " + name);
        System.out.println("Shoe added (id length " + id.length() + ")");
        enter();
    }

    void viewShoes() {
        if (shoes.isEmpty()) {
            System.out.println("No shoes available...");
            enter();
            return;
        }
        System.out.println("===============================================================");
        System.out.printf("| %-3s | %-6s | %-20s | %-8s | %-10s | %-6s |\n", "No.", "ID", "Name", "Category", "Release", "Price");
        int i = 1;
        for (Shoe s : shoes) {
            System.out.printf("| %-3d | %-6s | %-20s | %-8s | %-10s | %-6d |\n", i++, "SH***", s.getName(), s.getCategory(), s.getReleaseDate(), s.getPrice());
        }
        System.out.println("===============================================================");
    }

    void deleteShoe() {
        viewShoes();
        if (shoes.isEmpty()) return;
        int idx = -1;
        do {
            System.out.print("Choose shoe's number to delete [1.." + shoes.size() + "]: ");
            try { idx = scan.nextInt(); } catch (Exception e) { idx = -1; }
            scan.nextLine();
        } while (idx < 1 || idx > shoes.size());
        shoes.remove(idx - 1);
        System.out.println("Shoe removed!");
        enter();
    }

    public Main() {
        int menu = 0;
        do {
            cls();
            System.out.println("Shoe Shop");
            System.out.println("=========");
            System.out.println("1. View Shoes");
            System.out.println("2. Add Shoe");
            System.out.println("3. Delete Shoe");
            System.out.println("4. Exit");
            System.out.print(">> ");
            try {
                menu = scan.nextInt();
            } catch (Exception e) {
                menu = -1;
            }
            scan.nextLine();
            switch (menu) {
                case 1:
                    viewShoes();
                    break;
                case 2:
                    addShoe();
                    break;
                case 3:
                    deleteShoe();
                    break;
                case 4:
                    System.out.println("Logs: " + logs);
                    break;
                default:
                    break;
            }
        } while (menu != 4);
    }

    public static void main(String[] args) {
        new Main();
    }
}
