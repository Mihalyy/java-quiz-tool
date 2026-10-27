// Hello + Scanner input
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        System.out.print("What is your name? ");
        String name = sc.nextLine();

        System.out.print("How old are you? ");
        int age = sc.nextInt();

        System.out.println("Hello, " + name + "! Next year you will be " + (age + 1) + ".");
    }
}
