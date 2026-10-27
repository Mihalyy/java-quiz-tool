import java.util.Scanner;
public class Main {
    static String grade(int score) {
        if (score >= 80) {
            return "A";
        } else if (score >= 60) {
            return "B";
        } else if (score < 60) {
            return "C";
        }
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int total;
        for (int i = 0; i < 3; i++) {
            total += sc.nextInt();
        }
        for (int i = 0; i < 3; i++) {
            continue;
            System.out.println(i);
        }
        String msg;
        switch (sc.nextInt()) {
            case 1: msg = "one"; break;
            case 2: msg = "two"; break;
        }
        System.out.println(msg);
    }
}
