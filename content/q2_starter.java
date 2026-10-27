import java.util.Scanner;

class Member {
    private String name;
    private int points;

    public Member(String name) {
        this.name = name;
        this.points = 0;
    }

    // TODO: add the public methods from the question
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Member m = new Member(sc.nextLine());
        int n = sc.nextInt();
        for (int i = 0; i < n; i++) {
            String cmd = sc.next();
            int amount = sc.nextInt();
            if (cmd.equals("ADD")) {
                m.points += amount;                 // does not compile: points is private
                System.out.println("Points: " + m.points);
            } else if (cmd.equals("REDEEM")) {
                if (m.points >= amount) {
                    m.points -= amount;
                    System.out.println("Redeemed " + amount + " points");
                }
            }
        }
        System.out.println(m.name + " has " + m.points + " points");
    }
}
