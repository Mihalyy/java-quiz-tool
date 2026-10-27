import java.util.Scanner;

class Member {
    private String name;
    private int points;

    public Member(String name) {
        this.name = name;
        this.points = 0;
    }

    public String getName() { return name; }

    public int getPoints() { return points; }

    public void addPoints(int amount) {
        if (amount > 0) {
            points += amount;
        }
    }

    public boolean redeemPoints(int amount) {
        if (amount <= 0 || amount > points) {
            return false;
        }
        points -= amount;
        return true;
    }
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
                m.addPoints(amount);
                System.out.println("Points: " + m.getPoints());
            } else if (cmd.equals("REDEEM")) {
                if (m.redeemPoints(amount)) {
                    System.out.println("Redeemed " + amount + " points");
                } else {
                    System.out.println("Failed to redeem " + amount + " points");
                }
            }
        }
        System.out.println(m.getName() + " has " + m.getPoints() + " points");
    }
}
