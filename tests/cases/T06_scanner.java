import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        sc.nextLine();
        String name = sc.nextLine();
        double price = sc.nextDouble();
        String word = sc.next();
        System.out.println(n + "|" + name + "|" + price + "|" + word);
        int choice = -1;
        try { choice = sc.nextInt(); } catch (InputMismatchException e) { System.out.println("bad input"); sc.nextLine(); }
        System.out.println("choice=" + choice);
        choice = sc.nextInt(); sc.nextLine();
        System.out.println("choice=" + choice);
        String line = sc.nextLine();
        System.out.println("[" + line + "]");
        while (sc.hasNextInt()) { System.out.print(sc.nextInt() * 2 + " "); }
        System.out.println();
        System.out.println(sc.hasNext() + " " + sc.next());
        System.out.println(sc.hasNextLine() + " [" + sc.nextLine() + "]");
        System.out.println(sc.hasNextLine());
        String last = sc.nextLine();
    }
}
