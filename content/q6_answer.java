import java.util.ArrayList;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        ArrayList<Integer> sales = new ArrayList<>();

        int x = sc.nextInt();
        while (x != 0) {
            sales.add(x);
            x = sc.nextInt();
        }

        if (sales.isEmpty()) {
            System.out.println("No data");
            return;
        }

        int sum = 0;
        int max = sales.get(0);
        int min = sales.get(0);
        for (int s : sales) {
            sum += s;
            if (s > max) max = s;
            if (s < min) min = s;
        }
        double average = (double) sum / sales.size();

        System.out.println("Count: " + sales.size());
        System.out.println("Sum: " + sum);
        System.out.printf("Average: %.2f%n", average);
        System.out.println("Highest: " + max);
        System.out.println("Lowest: " + min);

        sales.removeIf(s -> s < average);
        System.out.println("At or above average: " + sales);
    }
}
