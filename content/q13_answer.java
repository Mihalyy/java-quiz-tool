import java.util.ArrayList;
import java.util.Scanner;

abstract class Member {
    private String id;
    private String name;
    private String phone;

    public Member(String id, String name, String phone) {
        this.id = id;
        this.name = name;
        this.phone = phone;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getPhone() { return phone; }

    public abstract String getType();
    public abstract int getDiscount();
}

class RegularMember extends Member {
    public RegularMember(String id, String name, String phone) { super(id, name, phone); }
    public String getType() { return "Regular"; }
    public int getDiscount() { return 5; }
}

class VipMember extends Member {
    public VipMember(String id, String name, String phone) { super(id, name, phone); }
    public String getType() { return "VIP"; }
    public int getDiscount() { return 15; }
}

public class Main {
    static Scanner sc = new Scanner(System.in);
    static ArrayList<Member> members = new ArrayList<>();
    static int counter = 1;

    static boolean validPhone(String phone) {
        if (!phone.startsWith("08") || phone.length() < 10 || phone.length() > 13) return false;
        for (char c : phone.toCharArray()) {
            if (!Character.isDigit(c)) return false;
        }
        return true;
    }

    static void register() {
        String name;
        do {
            System.out.print("Input name [3-20 characters]: ");
            name = sc.nextLine();
        } while (name.length() < 3 || name.length() > 20);

        String phone;
        do {
            System.out.print("Input phone [starts with 08, 10-13 digits]: ");
            phone = sc.nextLine();
        } while (!validPhone(phone));

        String type;
        do {
            System.out.print("Input member type [Regular | VIP]: ");
            type = sc.nextLine();
        } while (!type.equals("Regular") && !type.equals("VIP"));

        String id = String.format("MB%03d", counter++);
        if (type.equals("VIP")) members.add(new VipMember(id, name, phone));
        else members.add(new RegularMember(id, name, phone));
        System.out.println("Member " + id + " registered!");
    }

    static boolean view() {
        if (members.isEmpty()) {
            System.out.println("No members yet!");
            return false;
        }
        System.out.printf("| %-2s | %-5s | %-20s | %-13s | %-7s | %-8s |%n", "No", "ID", "Name", "Phone", "Type", "Discount");
        for (int i = 0; i < members.size(); i++) {
            Member m = members.get(i);
            System.out.printf("| %-2d | %-5s | %-20s | %-13s | %-7s | %-8s |%n",
                    i + 1, m.getId(), m.getName(), m.getPhone(), m.getType(), m.getDiscount() + "%");
        }
        return true;
    }

    static int chooseNumber(String prompt) {
        int no;
        do {
            System.out.print(prompt + " [1-" + members.size() + "]: ");
            try {
                no = sc.nextInt();
            } catch (Exception e) {
                no = 0;
            }
            sc.nextLine();
        } while (no < 1 || no > members.size());
        return no;
    }

    static void upgrade() {
        if (!view()) return;
        int no = chooseNumber("Choose member to upgrade");
        Member m = members.get(no - 1);
        if (m instanceof VipMember) {
            System.out.println("Member " + m.getId() + " is already VIP");
            return;
        }
        members.set(no - 1, new VipMember(m.getId(), m.getName(), m.getPhone()));
        System.out.println("Member " + m.getId() + " upgraded to VIP!");
    }

    static void remove() {
        if (!view()) return;
        int no = chooseNumber("Choose member to remove");
        Member m = members.remove(no - 1);
        System.out.println("Member " + m.getId() + " removed!");
    }

    public static void main(String[] args) {
        int choice;
        do {
            System.out.println("Hehe Membership");
            System.out.println("1. Register Member");
            System.out.println("2. View Members");
            System.out.println("3. Upgrade Member");
            System.out.println("4. Remove Member");
            System.out.println("5. Exit");
            System.out.print(">> ");
            try {
                choice = sc.nextInt();
            } catch (Exception e) {
                choice = 0;
            }
            sc.nextLine();
            switch (choice) {
                case 1: register(); break;
                case 2: view(); break;
                case 3: upgrade(); break;
                case 4: remove(); break;
                case 5: System.out.println("Bye!"); break;
            }
        } while (choice != 5);
    }
}
