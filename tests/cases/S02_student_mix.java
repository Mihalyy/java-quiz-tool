import java.util.*;

interface Printable { void print(); }

abstract class Person implements Printable {
    protected String name;
    protected int age;
    public Person(String name, int age) { this.name = name; this.age = age; }
    public abstract String getType();
    public void print() { System.out.println(getType() + ": " + name + " (" + age + ")"); }
}

class Student extends Person {
    private double gpa;
    private ArrayList<String> courses = new ArrayList<>();
    public Student(String name, int age, double gpa) { super(name, age); this.gpa = gpa; }
    public String getType() { return "Student"; }
    public void addCourse(String c) { courses.add(c); }
    public double getGpa() { return gpa; }
    @Override public void print() { super.print(); System.out.println("  GPA " + gpa + " courses " + courses); }
}

class Lecturer extends Person {
    private String code;
    public Lecturer(String name, int age, String code) { super(name, age); this.code = code; }
    public String getType() { return "Lecturer"; }
    public String getCode() { return code; }
}

class GpaComparator implements Comparator<Student> {
    @Override
    public int compare(Student a, Student b) {
        return Double.compare(b.getGpa(), a.getGpa());
    }
}

public class Main {
    private static int nextId = 1;
    private static final String PREFIX = "ST";

    static String generateId() { return PREFIX + String.format("%04d", nextId++); }

    static boolean isAlphaOnly(String s) {
        for (char c : s.toCharArray()) if (!Character.isLetter(c) && c != ' ') return false;
        return !s.isEmpty();
    }

    public static void main(String[] args) {
        List<Person> people = new ArrayList<>();
        Student a = new Student("Andi", 19, 3.45);
        a.addCourse("OOP"); a.addCourse("Database");
        Student b = new Student("Bella", 20, 3.92);
        Student c = new Student("Chandra", 18, 2.75);
        people.add(a); people.add(b); people.add(c);
        people.add(new Lecturer("Dr. Dewi", 41, "D1234"));
        for (Person p : people) p.print();

        List<Student> students = new ArrayList<>();
        for (Person p : people) if (p instanceof Student) students.add((Student) p);
        Collections.sort(students, new GpaComparator());
        System.out.print("Ranking:");
        for (Student s : students) System.out.print(" " + s.name);
        System.out.println();

        System.out.println(generateId() + " " + generateId());
        System.out.println(isAlphaOnly("Budi Santoso") + " " + isAlphaOnly("R2D2") + " " + isAlphaOnly(""));

        String email = "budi.santoso@hehe.co.id";
        boolean validEmail = email.contains("@") && email.indexOf('@') == email.lastIndexOf('@')
                && !email.startsWith("@") && email.endsWith(".co.id");
        System.out.println("email ok? " + validEmail + " user=" + email.substring(0, email.indexOf('@')));

        String phone = "081234567890";
        System.out.println(phone.matches("08[0-9]{10}") + " " + phone.startsWith("08") + " " + phone.length());

        int[] scores = {78, 92, 65, 88, 100};
        int max = Integer.MIN_VALUE, min = Integer.MAX_VALUE, total = 0;
        for (int s : scores) { max = Math.max(max, s); min = Math.min(min, s); total += s; }
        System.out.printf("max %d min %d avg %.1f%n", max, min, (double) total / scores.length);

        StringBuilder sb = new StringBuilder();
        for (int i = scores.length - 1; i >= 0; i--) sb.append(scores[i]).append(i > 0 ? "," : "");
        System.out.println(sb);

        String sentence = "the quick brown fox jumps over the lazy dog";
        Map<Character, Integer> freq = new TreeMap<>();
        for (char ch : sentence.replace(" ", "").toCharArray()) freq.put(ch, freq.getOrDefault(ch, 0) + 1);
        StringBuilder top = new StringBuilder();
        for (Map.Entry<Character, Integer> e : freq.entrySet()) if (e.getValue() > 2) top.append(e.getKey()).append('=').append(e.getValue()).append(' ');
        System.out.println(top.toString().trim());

        String[] words = sentence.split(" ");
        String longest = "";
        for (String w : words) if (w.length() > longest.length()) longest = w;
        System.out.println("longest=" + longest + " words=" + words.length + " capitalized=" + Character.toUpperCase(longest.charAt(0)) + longest.substring(1));

        Object[] things = {1, "two", 3.0, 'c', true, null, new int[0].length};
        for (Object o : things) System.out.print((o == null ? "null" : o.getClass().getSimpleName()) + " ");
        System.out.println();

        Iterator<Person> it = people.iterator();
        while (it.hasNext()) { Person p = it.next(); if (p.age < 19) it.remove(); }
        System.out.println("left: " + people.size());

        int choice = 2;
        String result;
        switch (choice) {
            case 1: result = "one"; break;
            case 2: result = "two"; break;
            default: result = "many";
        }
        System.out.println(result);
        long start = System.currentTimeMillis();
        System.out.println(start > 0);
    }
}
