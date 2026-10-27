import java.util.ArrayList;
import java.util.List;
import static java.lang.Math.*;

class Node<T> { T data; Node<T> next; Node(T d) { data = d; } }
class Stack {
    private Node<Integer> top;
    private int size;
    void push(int v) { Node<Integer> n = new Node<>(v); n.next = top; top = n; size++; }
    int pop() { if (top == null) throw new RuntimeException("Stack is empty"); int v = top.data; top = top.next; size--; return v; }
    boolean isEmpty() { return top == null; }
    int size() { return size; }
}
class InvalidInputException extends RuntimeException {
    InvalidInputException(String msg) { super(msg); }
}
class Library {
    private static int created = 0;
    private String name;
    private List<Book> books = new ArrayList<>();
    Library(String name) { this.name = name; created++; }
    class Book {
        private String title;
        Book(String title) { this.title = title; }
        String describe() { return title + " @ " + name + " (" + books.size() + " books)"; }
    }
    static class Stats { String report() { return "libraries created: " + created; } }
    Book add(String title) { Book b = new Book(title); books.add(b); return b; }
    Library self() { return this; }
    String getName() { return name; }
}
public class Main {
    private int count = 5;
    private String name = "field";
    void setName(String name) { this.name = name; }
    int count() { int count = 1; return count + this.count; }
    String name() { return name; }
    static int validate(int age) { if (age < 0) throw new InvalidInputException("age < 0: " + age); return age; }
    public static void main(String[] args) {
        Stack s = new Stack();
        for (int i = 1; i <= 4; i++) s.push(i * i);
        StringBuilder out = new StringBuilder();
        while (!s.isEmpty()) out.append(s.pop()).append(' ');
        System.out.println(out.toString().trim() + " size=" + s.size());
        try { s.pop(); } catch (RuntimeException e) { System.out.println(e.getMessage()); }
        Library lib = new Library("Central");
        lib.add("Java 101");
        Library.Book b = lib.add("OOP Patterns");
        System.out.println(b.describe() + " | " + new Library.Stats().report() + " | " + lib.self().self().getName());
        Main m = new Main();
        m.setName("changed");
        System.out.println(m.count() + " " + m.name());
        System.out.println(sqrt(16) + " " + max(3, 8) + " " + abs(-2.5) + " " + PI);
        try { validate(-3); } catch (InvalidInputException e) { System.out.println("invalid: " + e.getMessage()); }
        List<Node<String>> nodes = new ArrayList<>();
        nodes.add(new Node<>("a")); nodes.add(new Node<>("b"));
        nodes.get(0).next = nodes.get(1);
        System.out.println(nodes.get(0).next.data + nodes.size());
        int[] counts = new int[5];
        String text = "hello world";
        for (char c : text.toCharArray()) if (c != ' ') counts[(c - 'a') % 5]++;
        System.out.println(java.util.Arrays.toString(counts));
        java.util.Scanner fake = new java.util.Scanner("7 8");
        System.out.println(fake.nextInt() + fake.nextInt());
    }
}
