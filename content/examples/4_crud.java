// Mini CRUD with ArrayList (type the menu numbers in the console)
import java.util.ArrayList;
import java.util.Scanner;

public class Main {
    static ArrayList<String> items = new ArrayList<>();
    static Scanner sc = new Scanner(System.in);

    static void show() {
        if (items.isEmpty()) { System.out.println("(empty)"); return; }
        for (int i = 0; i < items.size(); i++) System.out.println((i + 1) + ". " + items.get(i));
    }

    public static void main(String[] args) {
        int choice;
        do {
            System.out.println("\n1. Add  2. View  3. Edit  4. Delete  5. Exit");
            System.out.print(">> ");
            try { choice = sc.nextInt(); } catch (Exception e) { choice = 0; }
            sc.nextLine();
            switch (choice) {
                case 1 -> {
                    System.out.print("Item name: ");
                    items.add(sc.nextLine());                       // Create
                }
                case 2 -> show();                                    // Read
                case 3 -> {
                    show();
                    if (items.isEmpty()) break;
                    System.out.print("Number to edit: ");
                    int i = sc.nextInt(); sc.nextLine();
                    if (i >= 1 && i <= items.size()) {
                        System.out.print("New name: ");
                        items.set(i - 1, sc.nextLine());            // Update
                    }
                }
                case 4 -> {
                    show();
                    if (items.isEmpty()) break;
                    System.out.print("Number to delete: ");
                    int i = sc.nextInt(); sc.nextLine();
                    if (i >= 1 && i <= items.size()) System.out.println("Removed " + items.remove(i - 1)); // Delete
                }
                case 5 -> System.out.println("Bye!");
                default -> System.out.println("Invalid choice");
            }
        } while (choice != 5);
    }
}
