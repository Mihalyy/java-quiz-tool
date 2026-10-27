import java.util.*;
abstract class Employee {
    private static int nextId = 1;
    protected final String id;
    protected String name;
    protected double baseSalary;
    public Employee(String name, double baseSalary) { this.id = "EM" + String.format("%03d", nextId++); this.name = name; this.baseSalary = baseSalary; }
    public abstract double calculateSalary();
    public String getName() { return name; }
    @Override public String toString() { return String.format("%s %-8s %12.2f", id, name, calculateSalary()); }
}
class Cashier extends Employee {
    private int shifts;
    public Cashier(String name, double base, int shifts) { super(name, base); this.shifts = shifts; }
    @Override public double calculateSalary() { return baseSalary + shifts * 50000; }
}
class Manager extends Employee {
    private double bonusPct;
    public Manager(String name, double base, double bonusPct) { super(name, base); this.bonusPct = bonusPct; }
    @Override public double calculateSalary() { return baseSalary * (1 + bonusPct / 100); }
    @Override public String toString() { return super.toString() + " (Manager)"; }
}
interface Discountable { double DEFAULT_RATE = 0.1; double discount(double price); }
class Member implements Discountable, Comparable<Member> {
    private String name; private int points;
    Member(String name, int points) { this.name = name; this.points = points; }
    public double discount(double price) { return points > 100 ? price * (1 - DEFAULT_RATE * 2) : price * (1 - DEFAULT_RATE); }
    public int compareTo(Member other) { return Integer.compare(other.points, points); }
    public String toString() { return name + "(" + points + ")"; }
}
public class Main {
    public static void main(String[] args) {
        List<Employee> staff = new ArrayList<>();
        staff.add(new Cashier("Ani", 3000000, 4));
        staff.add(new Manager("Budi", 8000000, 15));
        staff.add(new Cashier("Citra", 3200000, 2));
        double total = 0;
        for (Employee e : staff) { System.out.println(e); total += e.calculateSalary(); }
        System.out.printf("Total payroll: %.2f%n", total);
        staff.sort(Comparator.comparingDouble(Employee::calculateSalary).reversed());
        for (Employee e : staff) System.out.print(e.getName() + " ");
        System.out.println();
        int cashiers = 0; for (Employee e : staff) if (e instanceof Cashier) cashiers++;
        System.out.println("cashiers=" + cashiers);
        List<Member> ms = new ArrayList<>(List.of(new Member("A", 50), new Member("B", 150), new Member("C", 120)));
        Collections.sort(ms); System.out.println(ms);
        for (Member m : ms) System.out.printf("%s pays %.1f%n", m, m.discount(100000));
        Discountable d = ms.get(0); System.out.println(d.discount(50) + " " + Discountable.DEFAULT_RATE);
        Object o = ms.get(1); System.out.println(o.toString() + " " + (o instanceof Comparable) + " " + (o instanceof Discountable));
        Employee e1 = staff.get(0);
        System.out.println(e1.id + " " + e1.name);
    }
}
